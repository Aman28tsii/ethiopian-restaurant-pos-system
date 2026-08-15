import { query } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// Get all ingredients (with wastage settings)
export const getAllIngredients = catchAsync(async (req, res) => {
    const { category, lowStock, search } = req.query;
    
    let sql = `
        SELECT id, name, unit, quantity, min_stock, unit_cost, 
               category, supplier, default_wastage_percentage, 
               default_cooking_loss_percentage, safety_stock,
               last_used, created_at, updated_at
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
        `INSERT INTO ingredients (
            business_id, name, unit, quantity, min_stock, unit_cost, 
            category, supplier, default_wastage_percentage,
            default_cooking_loss_percentage, safety_stock
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, unit, quantity, min_stock, unit_cost, 
                  category, supplier, default_wastage_percentage,
                  default_cooking_loss_percentage, safety_stock`,
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

// Update ingredient (with wastage fields)
export const updateIngredient = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { 
        name, unit, quantity, min_stock, unit_cost, 
        category, supplier, default_wastage_percentage, 
        default_cooking_loss_percentage, safety_stock 
    } = req.body;

    const result = await query(`
        UPDATE ingredients 
        SET name = COALESCE($1, name),
            unit = COALESCE($2, unit),
            quantity = COALESCE($3, quantity),
            min_stock = COALESCE($4, min_stock),
            unit_cost = COALESCE($5, unit_cost),
            category = COALESCE($6, category),
            supplier = COALESCE($7, supplier),
            default_wastage_percentage = COALESCE($8, default_wastage_percentage),
            default_cooking_loss_percentage = COALESCE($9, default_cooking_loss_percentage),
            safety_stock = COALESCE($10, safety_stock),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *
    `, [
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
        'SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_id = $1',
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
    const result = await query(`
        SELECT id, name, unit, quantity, min_stock, category,
               safety_stock, (quantity + safety_stock) as effective_stock
        FROM ingredients
        WHERE quantity <= min_stock
        ORDER BY (quantity / NULLIF(min_stock, 0)) ASC
    `);
    
    res.json({ success: true, data: result.rows });
});

// Get low stock alert
export const getLowStockAlert = catchAsync(async (req, res) => {
    const result = await query(`
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
    `);
    
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
        'SELECT name, quantity, unit FROM ingredients WHERE id = $1',
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
    
    const result = await query(`
        UPDATE ingredients 
        SET quantity = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `, [newQuantity, id]);
    
    // Record stock transaction
    const transactionType = amount > 0 ? 'adjustment_add' : 'adjustment_remove';
    await query(`
        INSERT INTO stock_transactions (
            ingredient_id, expected_quantity, actual_quantity,
            wastage_amount, wastage_percentage, transaction_type, notes
        ) VALUES ($1, $2, $3, 0, 0, $4, $5)
    `, [id, Math.abs(amount), Math.abs(amount), transactionType, reason || 'Manual adjustment']);
    
    const action = amount > 0 ? 'added to' : 'removed from';
    const absAmount = Math.abs(amount);
    
    res.json({
        success: true,
        message: `${absAmount} ${result.rows[0].unit} ${action} ${result.rows[0].name}`,
        data: result.rows[0]
    });
});

// Get ingredient categories
export const getIngredientCategories = catchAsync(async (req, res) => {
    const result = await query(
        `SELECT DISTINCT category FROM ingredients WHERE category IS NOT NULL ORDER BY category`
    );
    
    res.json({ success: true, data: result.rows.map(r => r.category) });
});