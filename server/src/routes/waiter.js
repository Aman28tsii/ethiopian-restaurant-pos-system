import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// ==================== WAITER'S ASSIGNED TABLES ====================
router.get('/my-tables', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      'SELECT t.*, CASE WHEN t.self_assigned = true THEN  ELSE  END as assignment_type FROM tables t WHERE t.assigned_waiter_id =  ORDER BY t.status =  DESC, t.table_number ASC',
      ['Self-Assigned', 'Manager-Assigned', waiterId, 'occupied']
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get my tables error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AVAILABLE TABLES FOR SELF-ASSIGNMENT ====================
router.get('/available-tables', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      'SELECT t.* FROM tables t WHERE t.status =  AND (t.assigned_waiter_id IS NULL OR t.assigned_waiter_id = ) ORDER BY t.table_number ASC',
      ['available', waiterId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get available tables error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== WAITER SELF-ASSIGN TABLE ====================
router.post('/assign-table/:tableId', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const { tableId } = req.params;
  const waiterId = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const tableCheck = await client.query(
      'SELECT id, table_number, status, assigned_waiter_id FROM tables WHERE id = ',
      [tableId]
    );
    
    if (tableCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    const table = tableCheck.rows[0];
    
    if (table.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: 'Table ' + table.table_number + ' is ' + table.status + '. Only available tables can be assigned.' 
      });
    }
    
    const currentAssignments = await client.query(
      'SELECT COUNT(*) as count FROM tables WHERE assigned_waiter_id =  AND status IN (, , )',
      [waiterId, 'available', 'occupied', 'reserved']
    );
    
    if (parseInt(currentAssignments.rows[0].count) >= 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: 'You already have 5 assigned tables. Please unassign some tables first.' 
      });
    }
    
    await client.query(
      'UPDATE tables SET assigned_waiter_id = , assignment_date = CURRENT_DATE, assignment_method = , assigned_by = , self_assigned = true, updated_at = NOW() WHERE id = ',
      [waiterId, 'self', waiterId, tableId]
    );
    
    await client.query(
      'INSERT INTO waiter_self_assignments (waiter_id, table_id, status) VALUES (, , )',
      [waiterId, tableId, 'active']
    );
    
    await client.query('COMMIT');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('table_assigned', {
        table_id: tableId,
        table_number: table.table_number,
        waiter_id: waiterId,
        assignment_type: 'self'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Table ' + table.table_number + ' assigned to you successfully!',
      data: { table_id: tableId, table_number: table.table_number }
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Self-assign table error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==================== WAITER UNASSIGN TABLE ====================
router.delete('/unassign-table/:tableId', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const { tableId } = req.params;
  const waiterId = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const tableCheck = await client.query(
      'SELECT id, table_number, status, assigned_waiter_id FROM tables WHERE id =  AND assigned_waiter_id = ',
      [tableId, waiterId]
    );
    
    if (tableCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found or not assigned to you' 
      });
    }
    
    const table = tableCheck.rows[0];
    
    if (table.status === 'occupied') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: 'Table ' + table.table_number + ' is occupied. Cannot unassign until table is available.' 
      });
    }
    
    await client.query(
      'UPDATE tables SET assigned_waiter_id = NULL, assignment_date = NULL, assignment_method = NULL, self_assigned = false, updated_at = NOW() WHERE id = ',
      [tableId]
    );
    
    await client.query(
      'UPDATE waiter_self_assignments SET unassigned_at = NOW(), status =  WHERE table_id =  AND status = ',
      ['inactive', tableId, 'active']
    );
    
    await client.query('COMMIT');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('table_unassigned', {
        table_id: tableId,
        table_number: table.table_number,
        waiter_id: waiterId
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Table ' + table.table_number + ' unassigned successfully!' 
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Unassign table error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==================== WAITER'S CURRENT SHIFT ====================
router.get('/my-shift', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      'SELECT * FROM waiter_shifts WHERE waiter_id =  AND shift_date = CURRENT_DATE AND is_active = true',
      [waiterId]
    );
    
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Get my shift error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== WAITER'S ACTIVE ORDERS ====================
router.get('/my-orders', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      'SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.customer_name, o.table_id, o.created_at, o.source, t.table_number, COALESCE(json_agg(json_build_object(, p.name, , oi.quantity, , oi.unit_price)) FILTER (WHERE p.id IS NOT NULL), ) as items FROM orders o JOIN tables t ON o.table_id = t.id LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id WHERE t.assigned_waiter_id =  AND o.status NOT IN (, ) GROUP BY o.id, t.table_number, o.source ORDER BY o.created_at DESC',
      ['name', 'quantity', 'price', '[]', waiterId, 'completed', 'cancelled']
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get waiter orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== PENDING CONFIRMATIONS ====================
router.get('/pending-confirmations', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      'SELECT o.id, o.order_number, o.total_amount, o.customer_name, o.customer_phone, o.table_id, o.notes, o.created_at, o.status, o.source, t.table_number, COALESCE(json_agg(json_build_object(, p.name, , oi.quantity, , oi.unit_price)) FILTER (WHERE p.id IS NOT NULL), ) as items FROM orders o JOIN tables t ON o.table_id = t.id LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id WHERE o.status =  AND o.source =  AND t.assigned_waiter_id =  GROUP BY o.id, t.table_number, o.source ORDER BY o.created_at ASC',
      ['name', 'quantity', 'price', '[]', 'pending_confirmation', 'qr_menu', waiterId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get pending confirmations error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
