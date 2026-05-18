import express from 'express';
import { protect, allowOwner, allowManager } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// ==================== GET all ingredients ====================
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.* FROM ingredients i ORDER BY i.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get ingredients error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET low stock alert ====================
router.get('/low-stock-alert', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, quantity, min_stock, unit 
       FROM ingredients 
       WHERE quantity <= min_stock 
       ORDER BY quantity ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Low stock alert error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET low stock ====================
router.get('/low-stock', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, quantity, min_stock, unit, unit_cost 
       FROM ingredients 
       WHERE quantity <= min_stock`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Low stock error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CREATE ingredient ====================
router.post('/', protect, allowOwner, async (req, res) => {
  const { name, unit, quantity, min_stock, unit_cost, category, supplier } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO ingredients (name, unit, quantity, min_stock, unit_cost, category, supplier)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, unit, quantity || 0, min_stock || 0, unit_cost || 0, category, supplier]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create ingredient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== UPDATE ingredient ====================
router.put('/:id', protect, allowOwner, async (req, res) => {
  const { id } = req.params;
  const { name, unit, quantity, min_stock, unit_cost, category, supplier } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ingredients 
       SET name = $1, unit = $2, quantity = $3, min_stock = $4, 
           unit_cost = $5, category = $6, supplier = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, unit, quantity, min_stock, unit_cost, category, supplier, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update ingredient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== DELETE ingredient ====================
router.delete('/:id', protect, allowOwner, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM ingredients WHERE id = $1', [id]);
    res.json({ success: true, message: 'Ingredient deleted' });
  } catch (err) {
    console.error('Delete ingredient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== UPDATE wastage settings ====================
router.put('/:id/wastage', protect, allowOwner, async (req, res) => {
  const { id } = req.params;
  const { wastage_percentage, cooking_loss_percentage } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ingredients 
       SET wastage_percentage = $1, cooking_loss_percentage = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, wastage_percentage, cooking_loss_percentage`,
      [wastage_percentage || 0, cooking_loss_percentage || 0, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update wastage error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;