import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Get all tables (any authenticated user)
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT t.id, t.table_number, t.capacity, t.status, t.waiter_id, u.name as waiter_name FROM tables t LEFT JOIN users u ON t.waiter_id = u.id ORDER BY t.table_number ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get tables error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE new table
router.post('/', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
  const { table_number, capacity, status } = req.body;
  
  if (!table_number || !capacity) {
    return res.status(400).json({ success: false, error: 'Table number and capacity are required' });
  }
  
  try {
    const existing = await pool.query(
      'SELECT id FROM tables WHERE table_number = ',
      [table_number]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Table ' + table_number + ' already exists' });
    }
    
    const result = await pool.query(
      'INSERT INTO tables (table_number, capacity, status) VALUES (, , ) RETURNING id, table_number, capacity, status',
      [table_number, capacity, status || 'available']
    );
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Table ' + table_number + ' created successfully' });
  } catch (err) {
    console.error('Create table error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE table
router.put('/:id', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { table_number, capacity, status } = req.body;
  
  try {
    const tableCheck = await pool.query('SELECT id FROM tables WHERE id = ', [id]);
    if (tableCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    if (table_number) {
      const duplicate = await pool.query(
        'SELECT id FROM tables WHERE table_number =  AND id != ',
        [table_number, id]
      );
      if (duplicate.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Table ' + table_number + ' already exists' });
      }
    }
    
    const result = await pool.query(
      'UPDATE tables SET table_number = COALESCE(, table_number), capacity = COALESCE(, capacity), status = COALESCE(, status), updated_at = NOW() WHERE id =  RETURNING id, table_number, capacity, status',
      [table_number, capacity, status, id]
    );
    
    res.json({ success: true, data: result.rows[0], message: 'Table updated successfully' });
  } catch (err) {
    console.error('Update table error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE table
router.delete('/:id', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const tableCheck = await pool.query('SELECT id, table_number FROM tables WHERE id = ', [id]);
    if (tableCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    const tableNumber = tableCheck.rows[0].table_number;
    
    const activeOrders = await pool.query(
      'SELECT id FROM orders WHERE table_id =  AND status NOT IN (, )',
      [id, 'completed', 'cancelled']
    );
    
    if (activeOrders.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete Table ' + tableNumber + ' because it has active orders.' 
      });
    }
    
    await pool.query('DELETE FROM tables WHERE id = ', [id]);
    
    res.json({ success: true, message: 'Table ' + tableNumber + ' deleted successfully' });
  } catch (err) {
    console.error('Delete table error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single table
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT t.id, t.table_number, t.capacity, t.status, t.waiter_id, u.name as waiter_name FROM tables t LEFT JOIN users u ON t.waiter_id = u.id WHERE t.id = ',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get table error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
