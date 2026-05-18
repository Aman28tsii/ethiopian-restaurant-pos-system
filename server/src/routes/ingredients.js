import express from 'express';
import { protect, allowOwner, allowManager } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// ==================== GET all ingredients ====================
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, 
              COALESCE(
                (SELECT SUM(ri.quantity_required) 
                 FROM recipe_ingredients ri 
                 WHERE ri.ingredient_id = i.id), 0
              ) as used_in_products
       FROM ingredients i
       ORDER BY i.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get ingredients error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET single ingredient ====================
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ingredients WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get ingredient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CREATE ingredient ====================
router.post('/', protect, allowOwner, async (req, res) => {
  const { 
    name, unit, quantity, min_stock, unit_cost, 
    category, supplier, wastage_percentage, 
    cooking_loss_percentage, yield_percentage 
  } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO ingredients (name, unit, quantity, min_stock, unit_cost, category, supplier, 
        wastage_percentage, cooking_loss_percentage, yield_percentage, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [name, unit, quantity || 0, min_stock || 0, unit_cost || 0, 
       category || null, supplier || null, wastage_percentage || 0, 
       cooking_loss_percentage || 0, yield_percentage || 100]
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
  const { 
    name, unit, quantity, min_stock, unit_cost, 
    category, supplier, wastage_percentage, 
    cooking_loss_percentage, yield_percentage 
  } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE ingredients 
       SET name = COALESCE($1, name),
           unit = COALESCE($2, unit),
           quantity = COALESCE($3, quantity),
           min_stock = COALESCE($4, min_stock),
           unit_cost = COALESCE($5, unit_cost),
           category = COALESCE($6, category),
           supplier = COALESCE($7, supplier),
           wastage_percentage = COALESCE($8, wastage_percentage),
           cooking_loss_percentage = COALESCE($9, cooking_loss_percentage),
           yield_percentage = COALESCE($10, yield_percentage),
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [name, unit, quantity, min_stock, unit_cost, category, supplier, 
       wastage_percentage, cooking_loss_percentage, yield_percentage, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update ingredient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== UPDATE INGREDIENT WASTAGE SETTINGS ====================
router.put('/:id/wastage', protect, allowOwner, async (req, res) => {
  const { id } = req.params;
  const { wastage_percentage, cooking_loss_percentage, yield_percentage } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE ingredients 
      SET wastage_percentage = COALESCE($1, wastage_percentage),
          cooking_loss_percentage = COALESCE($2, cooking_loss_percentage),
          yield_percentage = COALESCE($3, yield_percentage),
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, wastage_percentage, cooking_loss_percentage, yield_percentage
    `, [wastage_percentage, cooking_loss_percentage, yield_percentage, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update wastage error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET LOW STOCK ALERT ====================
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

// ==================== GET LOW STOCK (for manager) ====================
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
    console.error('Get low stock error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET WASTAGE REPORT ====================
router.get('/wastage-report', protect, allowOwner, async (req, res) => {
  const { start_date, end_date } = req.query;
  
  try {
    // Get summary by ingredient
    const summaryResult = await pool.query(`
      SELECT 
        i.id,
        i.name,
        i.unit,
        COALESCE(SUM(st.expected_quantity), 0) as total_expected,
        COALESCE(SUM(st.actual_quantity), 0) as total_actual,
        COALESCE(SUM(st.wastage_amount), 0) as total_wastage,
        CASE 
          WHEN COALESCE(SUM(st.expected_quantity), 0) > 0 
          THEN (COALESCE(SUM(st.wastage_amount), 0) / NULLIF(COALESCE(SUM(st.expected_quantity), 0), 0) * 100)
          ELSE 0
        END as wastage_percentage,
        COALESCE(SUM(st.wastage_amount * i.unit_cost), 0) as wastage_cost
      FROM stock_transactions st
      JOIN ingredients i ON st.ingredient_id = i.id
      WHERE st.created_at >= COALESCE($1, '2024-01-01')
        AND st.created_at <= COALESCE($2, NOW())
      GROUP BY i.id, i.name, i.unit
      HAVING COALESCE(SUM(st.wastage_amount), 0) > 0
      ORDER BY wastage_cost DESC
    `, [start_date, end_date]);
    
    // Get daily breakdown
    const dailyResult = await pool.query(`
      SELECT 
        DATE(st.created_at) as date,
        COUNT(DISTINCT st.order_id) as orders_affected,
        COALESCE(SUM(st.wastage_amount), 0) as total_wastage,
        COALESCE(SUM(st.wastage_amount * i.unit_cost), 0) as total_cost
      FROM stock_transactions st
      JOIN ingredients i ON st.ingredient_id = i.id
      WHERE st.created_at >= COALESCE($1, '2024-01-01')
        AND st.created_at <= COALESCE($2, NOW())
      GROUP BY DATE(st.created_at)
      ORDER BY date DESC
    `, [start_date, end_date]);
    
    // Get total summary
    const totalResult = await pool.query(`
      SELECT 
        COALESCE(SUM(st.wastage_amount * i.unit_cost), 0) as total_wastage_cost,
        COALESCE(SUM(st.wastage_amount), 0) as total_wastage_quantity,
        COUNT(DISTINCT st.order_id) as orders_with_wastage
      FROM stock_transactions st
      JOIN ingredients i ON st.ingredient_id = i.id
      WHERE st.created_at >= COALESCE($1, '2024-01-01')
        AND st.created_at <= COALESCE($2, NOW())
    `, [start_date, end_date]);
    
    res.json({ 
      success: true, 
      data: {
        summary: summaryResult.rows,
        daily: dailyResult.rows,
        totals: totalResult.rows[0]
      }
    });
  } catch (err) {
    console.error('Wastage report error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== DELETE ingredient ====================
router.delete('/:id', protect, allowOwner, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if ingredient is used in any recipes
    const usageCheck = await pool.query(
      'SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_id = $1',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete ingredient that is used in recipes' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM ingredients WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    
    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (err) {
    console.error('Delete ingredient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ADJUST STOCK ====================
router.patch('/:id/stock', protect, allowManager, async (req, res) => {
  const { id } = req.params;
  const { quantity, operation = 'set' } = req.body; // operation: 'set', 'add', 'subtract'
  
  try {
    let query;
    let newQuantity;
    
    if (operation === 'add') {
      query = 'UPDATE ingredients SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *';
      newQuantity = quantity;
    } else if (operation === 'subtract') {
      query = 'UPDATE ingredients SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2 RETURNING *';
      newQuantity = quantity;
    } else {
      query = 'UPDATE ingredients SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
      newQuantity = quantity;
    }
    
    const result = await pool.query(query, [newQuantity, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Adjust stock error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;