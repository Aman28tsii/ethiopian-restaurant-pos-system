import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', protect, restrictTo('owner', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, address, loyalty_points, total_spent, visit_count, notes, created_at, last_visit FROM customers ORDER BY name ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// FIXED: Simple query without error
router.get('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM customers WHERE id = ', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', protect, restrictTo('owner', 'admin'), async (req, res) => {
  const { name, email, phone, address, notes } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, email, phone, address, notes, created_at) VALUES (, , , , , NOW()) RETURNING *',
      [name, email || null, phone || null, address || null, notes || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, loyalty_points, total_spent, visit_count, notes } = req.body;
  try {
    const result = await pool.query(
      'UPDATE customers SET name = COALESCE(, name), email = COALESCE(, email), phone = COALESCE(, phone), address = COALESCE(, address), loyalty_points = COALESCE(, loyalty_points), total_spent = COALESCE(, total_spent), visit_count = COALESCE(, visit_count), notes = COALESCE(, notes), updated_at = NOW() WHERE id =  RETURNING *',
      [name, email, phone, address, loyalty_points, total_spent, visit_count, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM customers WHERE id =  RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
