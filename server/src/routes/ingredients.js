import express from 'express';
import { protect, allowOwner, allowManager } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// GET all ingredients
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, unit, quantity, min_stock, unit_cost, category, supplier, 
              wastage_percentage, cooking_loss_percentage, yield_percentage,
              created_at, updated_at
       FROM ingredients 
       ORDER BY name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get ingredients error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET low stock alert
router.get('/low-stock-alert', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, quantity, min_stock, unit, category
       FROM ingredients 
       WHERE quantity <= min_stock 
       ORDER BY (quantity / NULLIF(min_stock, 0)) ASC
       LIMIT 20`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Low stock alert error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET low stock (for manager)
router.get('/low-stock', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, quantity, min_stock, unit, category, unit_cost
       FROM ingredients 
       WHERE quantity <= min_stock 
       ORDER BY (quantity / NULLIF(min_stock, 0)) ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Low stock error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;