import express from 'express';
import {
  getAllTables,
  getAvailableTables,
  getTableById,
  updateTableStatus,
  reserveTable
} from '../controllers/tableController.js';
import { protect, allowWaiter, allowManager } from '../middleware/auth.js';

const router = express.Router();

// All table routes require authentication
router.use(protect);

// Waiter and above can view tables
router.get('/', allowWaiter, getAllTables);
router.get('/available', allowWaiter, getAvailableTables);
router.get('/:id', allowWaiter, getTableById);

// Manager and above can update tables
router.put('/:id/status', allowManager, updateTableStatus);
router.post('/:id/reserve', allowWaiter, reserveTable);
// Create new table
router.post('/', protect, allowManager, async (req, res) => {
  const { table_number, capacity, status } = req.body;
  
  if (!table_number || !capacity) {
    return res.status(400).json({ success: false, error: 'Table number and capacity required' });
  }
  
  try {
    // Check if table number already exists
    const existing = await pool.query('SELECT id FROM tables WHERE table_number = $1', [table_number]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Table number already exists' });
    }
    
    const result = await pool.query(
      `INSERT INTO tables (table_number, capacity, status) 
       VALUES ($1, $2, $3) 
       RETURNING id, table_number, capacity, status`,
      [table_number, capacity, status || 'available']
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create table error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update table
router.put('/:id', protect, allowManager, async (req, res) => {
  const { id } = req.params;
  const { table_number, capacity, status } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE tables 
       SET table_number = COALESCE($1, table_number),
           capacity = COALESCE($2, capacity),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, table_number, capacity, status`,
      [table_number, capacity, status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update table error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete table
router.delete('/:id', protect, allowManager, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if table has active orders
    const activeOrders = await pool.query(
      'SELECT id FROM orders WHERE table_id = $1 AND status NOT IN ($2, $3)',
      [id, 'completed', 'cancelled']
    );
    
    if (activeOrders.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete table with active orders. Please wait for orders to complete.' 
      });
    }
    
    const result = await pool.query('DELETE FROM tables WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (err) {
    console.error('Delete table error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
export default router;