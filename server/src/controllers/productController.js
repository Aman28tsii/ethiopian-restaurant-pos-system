import { query } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// ============================================
// GET ALL PRODUCTS (Public)
// ============================================
export const getAllProducts = catchAsync(async (req, res) => {
    const { limit = 100, offset = 0 } = req.pagination || {};
    const result = await query(
        'SELECT id, name, price, category, description, is_available FROM products WHERE is_available = true ORDER BY name LIMIT $1 OFFSET $2',
        [limit, offset]
    );
    res.json({ success: true, data: result.rows });
});

// ============================================
// GET ALL PRODUCTS (Admin - includes unavailable)
// ============================================
export const getAllProductsAdmin = catchAsync(async (req, res) => {
    const result = await query(
        'SELECT id, name, price, category, description, is_available, created_at FROM products ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
});

// ============================================
// GET PRODUCT BY ID
// ============================================
export const getProductById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await query(
        'SELECT id, name, price, category, description, is_available FROM products WHERE id = $1',
        [id]
    );
    if (result.rows.length === 0) throw new AppError('Product not found', 404);
    res.json({ success: true, data: result.rows[0] });
});

// ============================================
// CREATE PRODUCT
// ============================================
export const createProduct = catchAsync(async (req, res) => {
    const { name, price, category, description } = req.body;
    
    if (!name || !price) {
        throw new AppError('Name and price are required', 400);
    }
    
    const result = await query(
        `INSERT INTO products (business_id, name, price, category, description, is_available) 
         VALUES (1, $1, $2, $3, $4, true) 
         RETURNING id, name, price, category, description, is_available`,
        [name.trim(), price, category || null, description || null]
    );
    
    res.status(201).json({ 
        success: true, 
        message: 'Product created successfully', 
        data: result.rows[0] 
    });
});

// ============================================
// UPDATE PRODUCT
// ============================================
export const updateProduct = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, price, category, is_available, description } = req.body;
    
    const result = await query(
        `UPDATE products 
         SET name = COALESCE($1, name), 
             price = COALESCE($2, price), 
             category = COALESCE($3, category), 
             is_available = COALESCE($4, is_available),
             description = COALESCE($5, description),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 
         RETURNING id, name, price, category, is_available, description`,
        [name, price, category, is_available, description, id]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('Product not found', 404);
    }
    
    res.json({ 
        success: true, 
        message: 'Product updated successfully', 
        data: result.rows[0] 
    });
});

// ============================================
// DELETE PRODUCT (Soft Delete)
// ============================================
export const deleteProduct = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const result = await query(
        'UPDATE products SET is_available = false WHERE id = $1 RETURNING id',
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new AppError('Product not found', 404);
    }
    
    res.json({ 
        success: true, 
        message: 'Product deleted successfully' 
    });
});

// ============================================
// GET CATEGORIES
// ============================================
export const getCategories = catchAsync(async (req, res) => {
    const result = await query(
        `SELECT DISTINCT category FROM products 
         WHERE is_available = true AND category IS NOT NULL 
         ORDER BY category`
    );
    
    res.json({ success: true, data: result.rows.map(r => r.category) });
});