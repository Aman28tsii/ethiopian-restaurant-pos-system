import express from 'express';
import { protect, allowOwner } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all customers
router.get('/', protect, allowOwner, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, address, loyalty_points, total_spent, visit_count, notes, created_at, last_visit
       FROM customers 
       ORDER BY name ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get customer by ID
router.get('/:id', protect, allowOwner, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM customers WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create customer
router.post('/', protect, allowOwner, async (req, res) => {
  const { name, email, phone, address, notes } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO customers (name, email, phone, address, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [name, email, phone, address, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update customer
router.put('/:id', protect, allowOwner, async (req, res) => {
  const { name, email, phone, address, loyalty_points, total_spent, visit_count, notes } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE customers 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           loyalty_points = COALESCE($5, loyalty_points),
           total_spent = COALESCE($6, total_spent),
           visit_count = COALESCE($7, visit_count),
           notes = COALESCE($8, notes),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, email, phone, address, loyalty_points, total_spent, visit_count, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete customer
router.delete('/:id', protect, allowOwner, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;