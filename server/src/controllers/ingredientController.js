import { query } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// Get all ingredients
export const getAllIngredients = catchAsync(async (req, res) => {
  const { category, lowStock, search } = req.query;
  
  let sql = `
    SELECT id, name, unit, quantity, min_stock, unit_cost, category, supplier
    FROM ingredients
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;
  
  if (category) {
    sql += ` AND category = $${paramIndex++}`;
    params.push(category);
  }
  
  if (lowStock === 'true') {
    sql += ` AND quantity <= min_stock`;
  }
  
  if (search) {
    sql += ` AND name ILIKE $${paramIndex++}`;
    params.push(`%${search}%`);
  }
  
  sql += ` ORDER BY name`;
  
  const result = await query(sql, params);
  
  res.json({ success: true, data: result.rows });
});

// Get single ingredient
export const getIngredientById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(
    `SELECT * FROM ingredients WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Ingredient not found', 404);
  }
  
  res.json({ success: true, data: result.rows[0] });
});

// Create ingredient
export const createIngredient = catchAsync(async (req, res) => {
  const { name, unit, quantity, min_stock, unit_cost, category, supplier } = req.body;
  const businessId = 1;
  
  if (!name || !unit) {
    throw new AppError('Name and unit are required', 400);
  }
  
  const result = await query(
    `INSERT INTO ingredients (business_id, name, unit, quantity, min_stock, unit_cost, category, supplier)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, unit, quantity, min_stock, unit_cost, category, supplier`,
    [businessId, name.trim(), unit, quantity || 0, min_stock || 0, unit_cost || 0, category, supplier]
  );
  
  res.status(201).json({
    success: true,
    message: 'Ingredient created successfully',
    data: result.rows[0]
  });
});

// Update ingredient
export const updateIngredient = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, unit, quantity, min_stock, unit_cost, category, supplier } = req.body;
  
  const result = await query(
    `UPDATE ingredients 
     SET name = COALESCE($1, name),
         unit = COALESCE($2, unit),
         quantity = COALESCE($3, quantity),
         min_stock = COALESCE($4, min_stock),
         unit_cost = COALESCE($5, unit_cost),
         category = COALESCE($6, category),
         supplier = COALESCE($7, supplier),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [name, unit, quantity, min_stock, unit_cost, category, supplier, id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Ingredient not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Ingredient updated successfully',
    data: result.rows[0]
  });
});

// Delete ingredient
export const deleteIngredient = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  // Check if ingredient is used in recipes
  const recipeCheck = await query(
    'SELECT COUNT(*) FROM recipes WHERE ingredient_id = $1',
    [id]
  );
  
  if (parseInt(recipeCheck.rows[0].count) > 0) {
    throw new AppError('Cannot delete ingredient that is used in recipes', 400);
  }
  
  const result = await query('DELETE FROM ingredients WHERE id = $1 RETURNING id', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Ingredient not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Ingredient deleted successfully'
  });
});

// Get low stock ingredients
export const getLowStock = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, name, unit, quantity, min_stock, category
     FROM ingredients
     WHERE quantity <= min_stock
     ORDER BY (quantity / NULLIF(min_stock, 0)) ASC`
  );
  
  res.json({ success: true, data: result.rows });
});

// Get ingredient categories
export const getIngredientCategories = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT DISTINCT category FROM ingredients WHERE category IS NOT NULL ORDER BY category`
  );
  
  res.json({ success: true, data: result.rows.map(r => r.category) });
});