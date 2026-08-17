// server/src/routes/categories.js
import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// ==================== GET ALL CATEGORIES ====================
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      SELECT * FROM categories 
       ORDER BY name ASC
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET CATEGORY WITH PRODUCT COUNT ====================
router.get('/with-count', protect, async (req, res) => {
  try {
    const result = await pool.query(
      SELECT c.*, 
              COUNT(p.id) as product_count,
              SUM(CASE WHEN p.is_available = true THEN 1 ELSE 0 END) as available_products
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       GROUP BY c.id
       ORDER BY c.name ASC
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get categories with count error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CREATE CATEGORY ====================
router.post('/', protect, restrictTo('owner', 'admin'), async (req, res) => {
  const { name, description, color, icon } = req.body;
  
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ 
      success: false, 
      error: 'Category name must be at least 2 characters' 
    });
  }
  
  try {
    // Check if category already exists
    const existing = await pool.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER()',
      [name.trim()]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category already exists' 
      });
    }
    
    const result = await pool.query(
      INSERT INTO categories (name, description, color, icon, created_at)
       VALUES (, , , , NOW())
       RETURNING *,
      [name.trim(), description || null, color || '#6B7280', icon || null]
    );
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== UPDATE CATEGORY ====================
router.put('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { name, description, color, icon } = req.body;
  
  try {
    const result = await pool.query(
      UPDATE categories 
       SET name = COALESCE(, name),
           description = COALESCE(, description),
           color = COALESCE(, color),
           icon = COALESCE(, icon),
           updated_at = NOW()
       WHERE id = 
       RETURNING *,
      [name, description, color, icon, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== DELETE CATEGORY ====================
router.delete('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if category has products
    const productCheck = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ',
      [id]
    );
    
    if (parseInt(productCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: Cannot delete category. It has  products assigned. Move or delete products first.
      });
    }
    
    const result = await pool.query(
      'DELETE FROM categories WHERE id =  RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET PRODUCTS BY CATEGORY ====================
router.get('/:id/products', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      SELECT p.*,
              c.name as category_name,
              c.color as category_color
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.category_id = 
       ORDER BY p.name ASC,
      [id]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get products by category error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
