// server/src/routes/products.js
import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} from '../controllers/productController.js';
import { validateProduct, validatePagination } from '../middleware/validation.js';
import { protect, allowManager } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Public routes (no auth needed for viewing)
router.get('/', validatePagination, getAllProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Get products by category
router.get('/category/:categoryId', protect, async (req, res) => {
  const { categoryId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.color as category_color
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.category_id = $1 AND p.is_available = true
       ORDER BY p.name ASC`,
      [categoryId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get products by category error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Protected routes (require authentication and manager role)
router.use(protect);
router.use(allowManager);

router.post('/', validateProduct, async (req, res) => {
  const { name, price, category, description, category_id } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ success: false, error: 'Name and price are required' });
  }
  
  try {
    // If category_id provided, use it; otherwise try to find by category name
    let finalCategoryId = category_id || null;
    
    if (!finalCategoryId && category) {
      const catResult = await pool.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
        [category.trim()]
      );
      if (catResult.rows.length > 0) {
        finalCategoryId = catResult.rows[0].id;
      }
    }
    
    const result = await pool.query(
      `INSERT INTO products (business_id, name, price, category, description, is_available, category_id) 
       VALUES (1, $1, $2, $3, $4, true, $5) 
       RETURNING id, name, price, category, description, is_available, category_id`,
      [name.trim(), price, category || null, description || null, finalCategoryId]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Product created successfully', 
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', validateProduct, async (req, res) => {
  const { id } = req.params;
  const { name, price, category, is_available, description, category_id } = req.body;
  
  try {
    let finalCategoryId = category_id || null;
    
    if (!finalCategoryId && category) {
      const catResult = await pool.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)',
        [category.trim()]
      );
      if (catResult.rows.length > 0) {
        finalCategoryId = catResult.rows[0].id;
      }
    }
    
    const result = await pool.query(
      `UPDATE products 
       SET name = COALESCE($1, name), 
           price = COALESCE($2, price), 
           category = COALESCE($3, category), 
           is_available = COALESCE($4, is_available),
           description = COALESCE($5, description),
           category_id = COALESCE($6, category_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING id, name, price, category, is_available, description, category_id`,
      [name, price, category, is_available, description, finalCategoryId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Product updated successfully', 
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', deleteProduct);

export default router;