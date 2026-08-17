import { query } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// Get all ingredients
export const getAllIngredients = catchAsync(async (req, res) => {
    const { category, lowStock, search } = req.query;
    
    let sql = 
        SELECT id, name, unit, quantity, min_stock, unit_cost, 
               category, supplier, default_wastage_percentage, 
               default_cooking_loss_percentage, safety_stock,
               last_used, created_at, updated_at
        FROM ingredients
        WHERE 1=1
    ;
    const params = [];
    let paramIndex = 1;
    
    if (category) {
        sql +=  AND category = UTF8{paramIndex++};
        params.push(category);
    }
    
    if (lowStock === 'true') {
        sql +=  AND quantity <= min_stock;
    }
    
    if (search) {
        sql +=  AND name ILIKE UTF8{paramIndex++};
        params.push(%%);
    }
    
    sql +=  ORDER BY name;
    
    const result = await query(sql, params);
    
    res.json({ success: true, data: result.rows });
});

// Get single ingredient
export const getIngredientById = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const result = await query(
        SELECT * FROM ingredients WHERE id = ,
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('Ingredient not found', 404);
    }
    
    res.json({ success: true, data: result.rows[0] });
});

// Create ingredient
export const createIngredient = catchAsync(async (req, res) => {
    const { 
        name, unit, quantity, min_stock, unit_cost, 
        category, supplier, default_wastage_percentage,
        default_cooking_loss_percentage, safety_stock 
    } = req.body;
    const businessId = 1;
    
    if (!name || !unit) {
        throw new AppError('Name and unit are required', 400);
    }
    
    const result = await query(
        INSERT INTO ingredients (
            business_id, name, unit, quantity, min_stock, unit_cost, 
            category, supplier, default_wastage_percentage,
            default_cooking_loss_percentage, safety_stock
        ) VALUES (, , , , , , , , , , )
        RETURNING id, name, unit, quantity, min_stock, unit_cost, 
                  category, supplier, default_wastage_percentage,
                  default_cooking_loss_percentage, safety_stock,
        [
            businessId, name.trim(), unit, quantity || 0, min_stock || 0, 
            unit_cost || 0, category, supplier,
            default_wastage_percentage || 0,
            default_cooking_loss_percentage || 0,
            safety_stock || 0
        ]
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
    const { 
        name, unit, quantity, min_stock, unit_cost, 
        category, supplier, default_wastage_percentage, 
        default_cooking_loss_percentage, safety_stock 
    } = req.body;

    const result = await query(
        UPDATE ingredients 
        SET name = COALESCE(, name),
            unit = COALESCE(, unit),
            quantity = COALESCE(, quantity),
            min_stock = COALESCE(, min_stock),
            unit_cost = COALESCE(, unit_cost),
            category = COALESCE(, category),
            supplier = COALESCE(, supplier),
            default_wastage_percentage = COALESCE(, default_wastage_percentage),
            default_cooking_loss_percentage = COALESCE(, default_cooking_loss_percentage),
            safety_stock = COALESCE(, safety_stock),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 
        RETURNING *
    , [
        name, unit, quantity, min_stock, unit_cost, 
        category, supplier, 
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
        message: 'Ingredient updated successfully',
        data: result.rows[0]
    });
});

// Delete ingredient
export const deleteIngredient = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const recipeCheck = await query(
        'SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_id = ',
        [id]
    );
    
    if (parseInt(recipeCheck.rows[0].count) > 0) {
        throw new AppError('Cannot delete ingredient that is used in recipes', 400);
    }
    
    const result = await query('DELETE FROM ingredients WHERE id =  RETURNING id', [id]);
    
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
        SELECT id, name, unit, quantity, min_stock, category,
               safety_stock, (quantity + safety_stock) as effective_stock
        FROM ingredients
        WHERE quantity <= min_stock
        ORDER BY (quantity / NULLIF(min_stock, 0)) ASC
    );
    
    res.json({ success: true, data: result.rows });
});

// Get low stock alert
export const getLowStockAlert = catchAsync(async (req, res) => {
    const result = await query(
        SELECT 
            id, 
            name, 
            unit, 
            quantity, 
            min_stock,
            safety_stock,
            (quantity + safety_stock) as effective_stock,
            (min_stock - quantity) as needed,
            category,
            supplier,
            CASE 
                WHEN quantity <= 0 THEN 'out_of_stock'
                WHEN quantity <= min_stock THEN 'critical'
                WHEN quantity <= min_stock + safety_stock THEN 'low'
                ELSE 'ok'
            END as stock_status
        FROM ingredients
        WHERE quantity <= min_stock
        ORDER BY (quantity / NULLIF(min_stock, 0)) ASC
    );
    
    res.json({ 
        success: true, 
        data: result.rows,
        count: result.rows.length
    });
});

// Adjust stock
export const adjustStock = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { amount, reason } = req.body;
    
    const currentIngredient = await query(
        'SELECT name, quantity, unit FROM ingredients WHERE id = ',
        [id]
    );
    
    if (currentIngredient.rows.length === 0) {
        throw new AppError('Ingredient not found', 404);
    }
    
    const currentQuantity = parseFloat(currentIngredient.rows[0].quantity);
    const newQuantity = currentQuantity + parseFloat(amount);
    
    if (newQuantity < 0) {
        throw new AppError('Cannot reduce stock below zero', 400);
    }
    
    const result = await query(
        UPDATE ingredients 
        SET quantity = ,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 
        RETURNING *
    , [newQuantity, id]);
    
    // Record stock transaction
    const transactionType = amount > 0 ? 'adjustment_add' : 'adjustment_remove';
    await query(
        INSERT INTO stock_transactions (
            ingredient_id, expected_quantity, actual_quantity,
            wastage_amount, wastage_percentage, transaction_type, notes
        ) VALUES (, , , 0, 0, , )
    , [id, Math.abs(amount), Math.abs(amount), transactionType, reason || 'Manual adjustment']);
    
    const action = amount > 0 ? 'added to' : 'removed from';
    const absAmount = Math.abs(amount);
    
    res.json({
        success: true,
        message: ${absAmount}   ,
        data: result.rows[0]
    });
});

// Get ingredient categories
export const getIngredientCategories = catchAsync(async (req, res) => {
    const result = await query(
        SELECT DISTINCT category FROM ingredients WHERE category IS NOT NULL ORDER BY category
    );
    
    res.json({ success: true, data: result.rows.map(r => r.category) });
});
