import { query, getClient } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// ============================================
// RECIPE MANAGEMENT
// ============================================

// Get all recipes with ingredients and cost
export const getAllRecipes = catchAsync(async (req, res) => {
    const result = await query(`
        SELECT 
            r.id as recipe_id,
            r.product_id,
            r.yield_quantity,
            p.name as product_name,
            p.price as selling_price,
            p.category,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', ri.id,
                        'ingredient_id', ri.ingredient_id,
                        'ingredient_name', i.name,
                        'quantity_required', ri.quantity_required,
                        'unit', i.unit,
                        'unit_cost', i.unit_cost,
                        'wastage_percentage', ri.wastage_percentage,
                        'cooking_loss_percentage', ri.cooking_loss_percentage,
                        'cost_per_product', ROUND((ri.quantity_required * i.unit_cost)::numeric, 2)
                    )
                ) FILTER (WHERE ri.id IS NOT NULL),
                '[]'
            ) as ingredients
        FROM recipes r
        JOIN products p ON r.product_id = p.id
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        GROUP BY r.id, p.name, p.price, p.category
        ORDER BY p.name
    `);

    // Calculate totals for each recipe
    const recipesWithCost = result.rows.map(recipe => {
        let totalCost = 0;
        let totalWithWastage = 0;
        
        recipe.ingredients.forEach(ing => {
            const qty = parseFloat(ing.quantity_required) || 0;
            const cost = parseFloat(ing.unit_cost) || 0;
            const wastage = parseFloat(ing.wastage_percentage) || 0;
            const cookingLoss = parseFloat(ing.cooking_loss_percentage) || 0;
            
            // Base cost
            totalCost += qty * cost;
            
            // Cost with wastage
            const effectiveQty = qty * (1 + wastage / 100) * (1 + cookingLoss / 100);
            totalWithWastage += effectiveQty * cost;
        });
        
        const sellingPrice = parseFloat(recipe.selling_price) || 0;
        
        return {
            ...recipe,
            total_ingredient_cost: parseFloat(totalCost.toFixed(2)),
            total_cost_with_wastage: parseFloat(totalWithWastage.toFixed(2)),
            profit: parseFloat((sellingPrice - totalWithWastage).toFixed(2)),
            profit_margin: sellingPrice > 0 ? parseFloat(((sellingPrice - totalWithWastage) / sellingPrice * 100).toFixed(2)) : 0
        };
    });

    res.json({ success: true, data: recipesWithCost });
});

// Get recipe for specific product
export const getRecipeByProduct = catchAsync(async (req, res) => {
    const { productId } = req.params;

    const productResult = await query(
        'SELECT id, name, price, category FROM products WHERE id = $1',
        [productId]
    );

    if (productResult.rows.length === 0) {
        throw new AppError('Product not found', 404);
    }

    const recipeResult = await query(`
        SELECT 
            r.id as recipe_id,
            r.yield_quantity,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', ri.id,
                        'ingredient_id', ri.ingredient_id,
                        'ingredient_name', i.name,
                        'quantity_required', ri.quantity_required,
                        'unit', i.unit,
                        'unit_cost', i.unit_cost,
                        'wastage_percentage', ri.wastage_percentage,
                        'cooking_loss_percentage', ri.cooking_loss_percentage,
                        'current_stock', i.quantity,
                        'cost_per_product', ROUND((ri.quantity_required * i.unit_cost)::numeric, 2)
                    )
                ) FILTER (WHERE ri.id IS NOT NULL),
                '[]'
            ) as ingredients
        FROM recipes r
        LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE r.product_id = $1
        GROUP BY r.id
    `, [productId]);

    const product = productResult.rows[0];
    const recipe = recipeResult.rows[0] || { recipe_id: null, yield_quantity: 1, ingredients: [] };
    
    let totalCost = 0;
    let totalWithWastage = 0;
    
    recipe.ingredients.forEach(ing => {
        const qty = parseFloat(ing.quantity_required) || 0;
        const cost = parseFloat(ing.unit_cost) || 0;
        const wastage = parseFloat(ing.wastage_percentage) || 0;
        const cookingLoss = parseFloat(ing.cooking_loss_percentage) || 0;
        
        totalCost += qty * cost;
        const effectiveQty = qty * (1 + wastage / 100) * (1 + cookingLoss / 100);
        totalWithWastage += effectiveQty * cost;
    });
    
    const sellingPrice = parseFloat(product.price);

    res.json({
        success: true,
        data: {
            product_id: parseInt(productId),
            product_name: product.name,
            product_category: product.category,
            selling_price: sellingPrice,
            recipe_id: recipe.recipe_id,
            yield_quantity: recipe.yield_quantity,
            total_ingredient_cost: parseFloat(totalCost.toFixed(2)),
            total_cost_with_wastage: parseFloat(totalWithWastage.toFixed(2)),
            profit: parseFloat((sellingPrice - totalWithWastage).toFixed(2)),
            profit_margin: sellingPrice > 0 ? parseFloat(((sellingPrice - totalWithWastage) / sellingPrice * 100).toFixed(2)) : 0,
            ingredients: recipe.ingredients
        }
    });
});

// Create or update recipe
export const createOrUpdateRecipe = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const { yield_quantity = 1, ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        throw new AppError('At least one ingredient is required', 400);
    }

    const productCheck = await query('SELECT id FROM products WHERE id = $1', [productId]);
    if (productCheck.rows.length === 0) {
        throw new AppError('Product not found', 404);
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Check if recipe exists
        const existingRecipe = await client.query(
            'SELECT id FROM recipes WHERE product_id = $1',
            [productId]
        );

        let recipeId;
        if (existingRecipe.rows.length > 0) {
            recipeId = existingRecipe.rows[0].id;
            await client.query(
                'UPDATE recipes SET yield_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [yield_quantity, recipeId]
            );
            await client.query(
                'DELETE FROM recipe_ingredients WHERE recipe_id = $1',
                [recipeId]
            );
        } else {
            const result = await client.query(
                `INSERT INTO recipes (product_id, yield_quantity) 
                 VALUES ($1, $2) RETURNING id`,
                [productId, yield_quantity]
            );
            recipeId = result.rows[0].id;
        }

        // Insert new recipe ingredients
        for (const item of ingredients) {
            if (!item.ingredient_id || !item.quantity_required || item.quantity_required <= 0) {
                throw new AppError('Each ingredient requires valid ingredient_id and quantity_required', 400);
            }

            const ingredientCheck = await client.query(
                'SELECT id, unit FROM ingredients WHERE id = $1',
                [item.ingredient_id]
            );

            if (ingredientCheck.rows.length === 0) {
                throw new AppError(`Ingredient ID ${item.ingredient_id} not found`, 404);
            }

            await client.query(
                `INSERT INTO recipe_ingredients (
                    recipe_id, ingredient_id, quantity_required, 
                    wastage_percentage, cooking_loss_percentage, unit
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    recipeId, 
                    item.ingredient_id, 
                    item.quantity_required,
                    item.wastage_percentage || 0,
                    item.cooking_loss_percentage || 0,
                    ingredientCheck.rows[0].unit
                ]
            );
        }

        await client.query('COMMIT');

        // Return updated recipe
        const updatedRecipe = await query(`
            SELECT 
                r.id as recipe_id,
                r.yield_quantity,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', ri.id,
                            'ingredient_id', ri.ingredient_id,
                            'ingredient_name', i.name,
                            'quantity_required', ri.quantity_required,
                            'unit', i.unit,
                            'unit_cost', i.unit_cost,
                            'wastage_percentage', ri.wastage_percentage,
                            'cooking_loss_percentage', ri.cooking_loss_percentage
                        )
                    ) FILTER (WHERE ri.id IS NOT NULL),
                    '[]'
                ) as ingredients
            FROM recipes r
            LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
            LEFT JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE r.product_id = $1
            GROUP BY r.id
        `, [productId]);

        res.json({
            success: true,
            message: 'Recipe saved successfully',
            data: updatedRecipe.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

// Delete recipe
export const deleteRecipe = catchAsync(async (req, res) => {
    const { id } = req.params;

    const result = await query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
        throw new AppError('Recipe not found', 404);
    }

    res.json({
        success: true,
        message: 'Recipe deleted successfully'
    });
});

// Delete recipe ingredient
export const deleteRecipeIngredient = catchAsync(async (req, res) => {
    const { id } = req.params;

    const result = await query('DELETE FROM recipe_ingredients WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
        throw new AppError('Recipe ingredient not found', 404);
    }

    res.json({
        success: true,
        message: 'Recipe ingredient removed successfully'
    });
});

// ============================================
// STOCK DEDUCTION WITH WASTAGE
// ============================================

export const calculateStockDeductionWithWastage = (recipeIngredients, orderQuantity) => {
    const deductions = [];

    for (const ingredient of recipeIngredients) {
        const wastagePercent = parseFloat(ingredient.wastage_percentage) || 0;
        const cookingLossPercent = parseFloat(ingredient.cooking_loss_percentage) || 0;

        let expectedQuantity = parseFloat(ingredient.quantity_required) * orderQuantity;
        let afterWastage = expectedQuantity * (1 + (wastagePercent / 100));
        let finalQuantity = afterWastage * (1 + (cookingLossPercent / 100));

        if (ingredient.unit === 'pcs' || ingredient.unit === 'pieces') {
            finalQuantity = Math.ceil(finalQuantity);
        } else {
            finalQuantity = Math.ceil(finalQuantity * 100) / 100;
        }

        const wastageAmount = finalQuantity - expectedQuantity;
        const wastagePercentage = expectedQuantity > 0 
            ? (wastageAmount / expectedQuantity * 100).toFixed(1) 
            : 0;

        deductions.push({
            ingredient_id: ingredient.ingredient_id,
            ingredient_name: ingredient.name,
            expected_quantity: parseFloat(expectedQuantity.toFixed(3)),
            actual_quantity: parseFloat(finalQuantity.toFixed(3)),
            wastage_amount: parseFloat(wastageAmount.toFixed(3)),
            wastage_percentage: wastagePercentage,
            unit: ingredient.unit,
            unit_cost: parseFloat(ingredient.unit_cost) || 0,
            wastage_cost: parseFloat((wastageAmount * (parseFloat(ingredient.unit_cost) || 0)).toFixed(2)),
            current_stock: parseFloat(ingredient.current_stock) || 0
        });
    }

    return deductions;
};

// Process stock deduction for an order
export const processOrderStockDeduction = async (orderId, items, client) => {
    const allDeductions = [];
    let totalWastageCost = 0;

    for (const item of items) {
        const recipeQuery = `
            SELECT 
                ri.ingredient_id,
                ri.quantity_required,
                ri.wastage_percentage,
                ri.cooking_loss_percentage,
                i.name,
                i.unit,
                i.unit_cost,
                i.quantity as current_stock
            FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            JOIN recipes r ON ri.recipe_id = r.id
            WHERE r.product_id = $1
        `;

        const recipeResult = await client.query(recipeQuery, [item.product_id]);

        if (recipeResult.rows.length === 0) {
            console.warn(`No recipe found for product ${item.product_id}`);
            continue;
        }

        const deductions = calculateStockDeductionWithWastage(recipeResult.rows, item.quantity);

        for (const deduction of deductions) {
            // Check stock
            if (parseFloat(deduction.current_stock) < deduction.actual_quantity) {
                // Check safety stock
                const safetyStockResult = await client.query(
                    'SELECT safety_stock FROM ingredients WHERE id = $1',
                    [deduction.ingredient_id]
                );
                const safetyStock = parseFloat(safetyStockResult.rows[0]?.safety_stock || 0);
                const availableWithSafety = parseFloat(deduction.current_stock) + safetyStock;

                if (availableWithSafety < deduction.actual_quantity) {
                    throw new Error(
                        `Insufficient stock for ${deduction.ingredient_name}. ` +
                        `Available: ${deduction.current_stock} ${deduction.unit}, ` +
                        `Required: ${deduction.actual_quantity}`
                    );
                }

                console.warn(
                    `Using safety stock for ${deduction.ingredient_name}. ` +
                    `Available: ${deduction.current_stock}, Required: ${deduction.actual_quantity}`
                );
            }

            // Update stock
            await client.query(`
                UPDATE ingredients 
                SET quantity = quantity - $1,
                    last_used = NOW(),
                    updated_at = NOW()
                WHERE id = $2
            `, [deduction.actual_quantity, deduction.ingredient_id]);

            // Record transaction
            await client.query(`
                INSERT INTO stock_transactions (
                    ingredient_id, order_id, product_id,
                    expected_quantity, actual_quantity,
                    wastage_amount, wastage_percentage,
                    transaction_type, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'order_deduction', $8)
            `, [
                deduction.ingredient_id,
                orderId,
                item.product_id,
                deduction.expected_quantity,
                deduction.actual_quantity,
                deduction.wastage_amount,
                deduction.wastage_percentage,
                `Order ${orderId} - ${deduction.ingredient_name}`
            ]);

            allDeductions.push(deduction);
            totalWastageCost += deduction.wastage_cost;
        }
    }

    return { deductions: allDeductions, totalWastageCost };
};

// ============================================
// WASTAGE REPORTING
// ============================================

// Get wastage report
export const getWastageReport = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        throw new AppError('startDate and endDate are required', 400);
    }

    const result = await query(`
        SELECT 
            i.id as ingredient_id,
            i.name as ingredient_name,
            i.unit,
            COUNT(st.id) as transaction_count,
            SUM(st.expected_quantity) as total_expected,
            SUM(st.actual_quantity) as total_actual,
            SUM(st.wastage_amount) as total_wastage,
            AVG(st.wastage_percentage) as avg_wastage_percentage,
            SUM(st.wastage_amount * i.unit_cost) as total_wastage_cost
        FROM stock_transactions st
        JOIN ingredients i ON st.ingredient_id = i.id
        WHERE DATE(st.created_at) BETWEEN $1 AND $2
        AND st.transaction_type = 'order_deduction'
        GROUP BY i.id, i.name, i.unit
        ORDER BY total_wastage_cost DESC
    `, [startDate, endDate]);

    const summary = await query(`
        SELECT 
            SUM(st.expected_quantity) as total_expected,
            SUM(st.actual_quantity) as total_actual,
            SUM(st.wastage_amount) as total_wastage,
            SUM(st.wastage_amount * i.unit_cost) as total_wastage_cost,
            AVG(st.wastage_percentage) as avg_wastage_percentage
        FROM stock_transactions st
        JOIN ingredients i ON st.ingredient_id = i.id
        WHERE DATE(st.created_at) BETWEEN $1 AND $2
        AND st.transaction_type = 'order_deduction'
    `, [startDate, endDate]);

    res.json({
        success: true,
        data: {
            period: { startDate, endDate },
            summary: summary.rows[0] || { 
                total_expected: 0, 
                total_actual: 0, 
                total_wastage: 0, 
                total_wastage_cost: 0,
                avg_wastage_percentage: 0
            },
            details: result.rows
        }
    });
});

// Get wastage for specific order
export const getOrderWastage = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    const result = await query(`
        SELECT 
            st.ingredient_id,
            i.name as ingredient_name,
            i.unit,
            st.expected_quantity,
            st.actual_quantity,
            st.wastage_amount,
            st.wastage_percentage,
            st.created_at,
            ROUND((st.wastage_amount * i.unit_cost)::numeric, 2) as wastage_cost,
            p.name as product_name
        FROM stock_transactions st
        JOIN ingredients i ON st.ingredient_id = i.id
        LEFT JOIN products p ON st.product_id = p.id
        WHERE st.order_id = $1
        ORDER BY st.wastage_amount DESC
    `, [orderId]);

    const summary = await query(`
        SELECT 
            SUM(st.wastage_amount * i.unit_cost) as total_wastage_cost,
            SUM(st.wastage_amount) as total_wastage_quantity,
            AVG(st.wastage_percentage) as avg_wastage_percentage
        FROM stock_transactions st
        JOIN ingredients i ON st.ingredient_id = i.id
        WHERE st.order_id = $1
    `, [orderId]);

    res.json({
        success: true,
        data: {
            details: result.rows,
            summary: summary.rows[0] || { 
                total_wastage_cost: 0, 
                total_wastage_quantity: 0, 
                avg_wastage_percentage: 0 
            }
        }
    });
});

// Calculate wastage for an order (POST)
export const calculateOrderWastage = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    
    const orderItems = await query(
        `SELECT oi.product_id, oi.quantity 
         FROM order_items oi 
         WHERE oi.order_id = $1`,
        [orderId]
    );

    if (orderItems.rows.length === 0) {
        throw new AppError('Order not found or has no items', 404);
    }

    const client = await getClient();
    
    try {
        await client.query('BEGIN');
        const result = await processOrderStockDeduction(orderId, orderItems.rows, client);
        await client.query('COMMIT');
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

// Update ingredient wastage settings
export const updateIngredientWastage = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { default_wastage_percentage, default_cooking_loss_percentage, safety_stock } = req.body;

    const result = await query(`
        UPDATE ingredients 
        SET default_wastage_percentage = COALESCE($1, default_wastage_percentage),
            default_cooking_loss_percentage = COALESCE($2, default_cooking_loss_percentage),
            safety_stock = COALESCE($3, safety_stock),
            updated_at = NOW()
        WHERE id = $4
        RETURNING id, name, default_wastage_percentage, default_cooking_loss_percentage, safety_stock
    `, [
        default_wastage_percentage || 0,
        default_cooking_loss_percentage || 0,
        safety_stock || 0,
        id
    ]);

    if (result.rows.length === 0) {
        throw new AppError('Ingredient not found', 404);
    }

    res.json({
        success: true,
        message: 'Wastage settings updated',
        data: result.rows[0]
    });
});

// Get all ingredients with wastage settings
export const getAllIngredientsWithWastage = catchAsync(async (req, res) => {
    const result = await query(`
        SELECT 
            id, name, unit, quantity, min_stock, unit_cost, 
            category, supplier, default_wastage_percentage, 
            default_cooking_loss_percentage, safety_stock,
            last_used, created_at
        FROM ingredients 
        ORDER BY name
    `);

    res.json({ success: true, data: result.rows });
});

// Get low stock ingredients with safety stock
export const getLowStockIngredients = catchAsync(async (req, res) => {
    const result = await query(`
        SELECT 
            id, name, unit, quantity, min_stock, safety_stock,
            (quantity + safety_stock) as effective_stock,
            CASE 
                WHEN quantity <= 0 THEN 'out_of_stock'
                WHEN quantity <= min_stock THEN 'critical'
                WHEN quantity <= min_stock + safety_stock THEN 'low'
                ELSE 'ok'
            END as stock_status
        FROM ingredients 
        WHERE quantity <= (min_stock + safety_stock)
        ORDER BY (quantity / NULLIF(min_stock + safety_stock, 0)) ASC
    `);

    res.json({ success: true, data: result.rows });
});

// Get products without recipes
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

// Get recipe count
export const getRecipeCount = catchAsync(async (req, res) => {
    const result = await query(`
        SELECT 
            COUNT(DISTINCT r.id) as total_recipes,
            COUNT(DISTINCT p.id) as total_products,
            COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN p.id END) as products_with_recipes
        FROM products p
        LEFT JOIN recipes r ON p.id = r.product_id
    `);

    res.json({
        success: true,
        data: result.rows[0]
    });
});