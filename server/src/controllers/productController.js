import { query } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// Get all products
export const getAllProducts = catchAsync(async (req, res) => {
  const { limit = 100, offset = 0 } = req.pagination || {};
  const result = await query(
    'SELECT id, name, price, category, image_url, is_available FROM products WHERE is_available = true ORDER BY name LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  res.json({ success: true, data: result.rows });
});

// Get all products (admin view - includes unavailable)
export const getAllProductsAdmin = catchAsync(async (req, res) => {
  const result = await query(
    'SELECT id, name, price, category, image_url, image_public_id, is_available, description, created_at FROM products ORDER BY name'
  );
  res.json({ success: true, data: result.rows });
});

// Get product by id
export const getProductById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await query('SELECT id, name, price, category, image_url, description, is_available FROM products WHERE id = $1', [id]);
  if (result.rows.length === 0) throw new AppError('Product not found', 404);
  res.json({ success: true, data: result.rows[0] });
});

// Create product
export const createProduct = catchAsync(async (req, res) => {
  const { name, price, category, description, image_url, image_public_id } = req.body;
  const result = await query(
    'INSERT INTO products (business_id, name, price, category, description, image_url, image_public_id, is_available) VALUES (1, $1, $2, $3, $4, $5, $6, true) RETURNING id, name, price, category, image_url',
    [name.trim(), price, category, description, image_url || null, image_public_id || null]
  );
  res.status(201).json({ success: true, message: 'Product created', data: result.rows[0] });
});

// Update product
export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, price, category, is_available, description, image_url, image_public_id } = req.body;
  const result = await query(
    `UPDATE products 
     SET name = COALESCE($1, name), 
         price = COALESCE($2, price), 
         category = COALESCE($3, category), 
         is_available = COALESCE($4, is_available),
         description = COALESCE($5, description),
         image_url = COALESCE($6, image_url),
         image_public_id = COALESCE($7, image_public_id),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8 
     RETURNING id, name, price, category, is_available, image_url`,
    [name, price, category, is_available, description, image_url, image_public_id, id]
  );
  if (result.rows.length === 0) throw new AppError('Product not found', 404);
  res.json({ success: true, message: 'Product updated', data: result.rows[0] });
});

// Delete product (soft delete)
export const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await query('UPDATE products SET is_available = false WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw new AppError('Product not found', 404);
  res.json({ success: true, message: 'Product deleted' });
});

// Get categories
export const getCategories = catchAsync(async (req, res) => {
  const result = await query('SELECT DISTINCT category FROM products WHERE is_available = true AND category IS NOT NULL ORDER BY category');
  res.json({ success: true, data: result.rows.map(r => r.category) });
});