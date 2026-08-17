import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// GET all products (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price, category, description, is_available FROM products WHERE is_available = true ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all products (admin view - includes unavailable)
router.get('/all', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price, category, description, is_available, created_at FROM products ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get all products error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, price, category, description, is_available FROM products WHERE id = ',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category'
    );
    res.json({ success: true, data: result.rows.map(function(r) { return r.category; }) });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create product (owner/admin only)
router.post('/', protect, restrictTo('owner', 'admin'), async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO products (name, price, category, description, is_available) VALUES (, , , , true) RETURNING id, name, price, category, description, is_available',
      [name.trim(), price, category || null, description || null]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update product (owner/admin only)
router.put('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, is_available, description } = req.body;
    
    const result = await pool.query(
      'UPDATE products SET name = COALESCE(, name), price = COALESCE(, price), category = COALESCE(, category), is_available = COALESCE(, is_available), description = COALESCE(, description), updated_at = CURRENT_TIMESTAMP WHERE id =  RETURNING id, name, price, category, is_available, description',
      [name, price, category, is_available, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE product (soft delete - owner/admin only)
router.delete('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE products SET is_available = false WHERE id =  RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
