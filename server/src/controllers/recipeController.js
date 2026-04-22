import { query, getClient } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// Get all recipes (with product and ingredient details)
export const getAllRecipes = catchAsync(async (req, res) => {
  const result = await query(`
    SELECT 
      r.id,
      r.product_id,
      p.name as product_name,
      r.ingredient_id,
      i.name as ingredient_name,
      r.quantity_required,
      i.unit,
      i.unit_cost,
      (r.quantity_required * i.unit_cost) as cost_per_product
    FROM recipes r
    JOIN products p ON r.product_id = p.id
    JOIN ingredients i ON r.ingredient_id = i.id
    ORDER BY p.name, i.name
  `);
  
  // Group by product
  const recipesByProduct = {};
  result.rows.forEach(row => {
    if (!recipesByProduct[row.product_id]) {
      recipesByProduct[row.product_id] = {
        product_id: row.product_id,
        product_name: row.product_name,
        ingredients: []
      };
    }
    recipesByProduct[row.product_id].ingredients.push({
      ingredient_id: row.ingredient_id,
      ingredient_name: row.ingredient_name,
      quantity_required: parseFloat(row.quantity_required),
      unit: row.unit,
      unit_cost: parseFloat(row.unit_cost),
      cost_per_product: parseFloat(row.cost_per_product)
    });
  });
  
  res.json({
    success: true,
    data: Object.values(recipesByProduct)
  });
});

// Get recipe for a specific product
export const getRecipeByProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  
  // Get product info
  const productResult = await query(
    'SELECT id, name, price FROM products WHERE id = $1',
    [productId]
  );
  
  if (productResult.rows.length === 0) {
    throw new AppError('Product not found', 404);
  }
  
  // Get recipe ingredients
  const ingredientsResult = await query(`
    SELECT 
      r.id,
      r.ingredient_id,
      i.name as ingredient_name,
      r.quantity_required,
      i.unit,
      i.unit_cost,
      i.quantity as current_stock,
      (r.quantity_required * i.unit_cost) as cost_per_product
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.product_id = $1
    ORDER BY i.name
  `, [productId]);
  
  const product = productResult.rows[0];
  const ingredients = ingredientsResult.rows;
  
  // Calculate total cost
  const totalCost = ingredients.reduce((sum, ing) => sum + parseFloat(ing.cost_per_product), 0);
  const sellingPrice = parseFloat(product.price);
  const profit = sellingPrice - totalCost;
  
  res.json({
    success: true,
    data: {
      product_id: parseInt(productId),
      product_name: product.name,
      selling_price: sellingPrice,
      total_ingredient_cost: totalCost,
      profit: profit,
      profit_margin: sellingPrice > 0 ? (profit / sellingPrice * 100).toFixed(2) : 0,
      ingredients: ingredients.map(ing => ({
        recipe_id: ing.id,
        ingredient_id: ing.ingredient_id,
        ingredient_name: ing.ingredient_name,
        quantity_required: parseFloat(ing.quantity_required),
        unit: ing.unit,
        unit_cost: parseFloat(ing.unit_cost),
        cost_per_product: parseFloat(ing.cost_per_product),
        current_stock: parseFloat(ing.current_stock)
      }))
    }
  });
});

// Create or update recipe for a product
export const createOrUpdateRecipe = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { ingredients } = req.body; // Array of { ingredient_id, quantity_required }
  
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    throw new AppError('At least one ingredient is required', 400);
  }
  
  // Check if product exists
  const productCheck = await query('SELECT id FROM products WHERE id = $1', [productId]);
  if (productCheck.rows.length === 0) {
    throw new AppError('Product not found', 404);
  }
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing recipes for this product
    await client.query('DELETE FROM recipes WHERE product_id = $1', [productId]);
    
    // Insert new recipes
    for (const item of ingredients) {
      if (!item.ingredient_id || !item.quantity_required || item.quantity_required <= 0) {
        throw new AppError('Each ingredient requires valid ingredient_id and quantity_required', 400);
      }
      
      // Check if ingredient exists
      const ingredientCheck = await client.query(
        'SELECT id FROM ingredients WHERE id = $1',
        [item.ingredient_id]
      );
      
      if (ingredientCheck.rows.length === 0) {
        throw new AppError(`Ingredient ID ${item.ingredient_id} not found`, 404);
      }
      
      await client.query(
        `INSERT INTO recipes (product_id, ingredient_id, quantity_required)
         VALUES ($1, $2, $3)`,
        [productId, item.ingredient_id, item.quantity_required]
      );
    }
    
    await client.query('COMMIT');
    
    // Return the updated recipe
    const result = await query(`
      SELECT 
        r.id,
        r.ingredient_id,
        i.name as ingredient_name,
        r.quantity_required,
        i.unit
      FROM recipes r
      JOIN ingredients i ON r.ingredient_id = i.id
      WHERE r.product_id = $1
      ORDER BY i.name
    `, [productId]);
    
    res.json({
      success: true,
      message: 'Recipe saved successfully',
      data: {
        product_id: parseInt(productId),
        ingredients: result.rows
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Delete a single recipe item
export const deleteRecipeItem = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const result = await query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Recipe item not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Recipe item deleted successfully'
  });
});

// Get products without recipes (for setup)
export const getProductsWithoutRecipes = catchAsync(async (req, res) => {
  const result = await query(`
    SELECT p.id, p.name, p.price, p.category
    FROM products p
    WHERE NOT EXISTS (
      SELECT 1 FROM recipes r WHERE r.product_id = p.id
    )
    AND p.is_available = true
    ORDER BY p.name
  `);
  
  res.json({
    success: true,
    data: result.rows
  });
});

// Calculate cost for a product
export const calculateProductCost = catchAsync(async (req, res) => {
  const { productId } = req.params;
  
  const result = await query(`
    SELECT 
      p.id,
      p.name,
      p.price,
      COALESCE(SUM(r.quantity_required * i.unit_cost), 0) as total_cost
    FROM products p
    LEFT JOIN recipes r ON p.id = r.product_id
    LEFT JOIN ingredients i ON r.ingredient_id = i.id
    WHERE p.id = $1
    GROUP BY p.id, p.name, p.price
  `, [productId]);
  
  if (result.rows.length === 0) {
    throw new AppError('Product not found', 404);
  }
  
  const product = result.rows[0];
  const totalCost = parseFloat(product.total_cost);
  const sellingPrice = parseFloat(product.price);
  const profit = sellingPrice - totalCost;
  
  res.json({
    success: true,
    data: {
      product_id: parseInt(productId),
      product_name: product.name,
      selling_price: sellingPrice,
      ingredient_cost: totalCost,
      profit: profit,
      profit_margin: sellingPrice > 0 ? (profit / sellingPrice * 100).toFixed(2) : 0
    }
  });
});