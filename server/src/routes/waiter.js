import express from 'express';
import { protect, allowWaiter, allowOwner } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// ==================== GET AVAILABLE TABLES FOR WAITER ====================
router.get('/available-tables', protect, allowWaiter, async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      `SELECT t.* 
       FROM tables t
       WHERE t.status = 'available' 
         AND (t.assigned_waiter_id IS NULL OR t.assigned_waiter_id = $1)
       ORDER BY t.table_number ASC`,
      [waiterId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get available tables error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== WAITER SELF-ASSIGN TABLE ====================
router.post('/assign-table/:tableId', protect, allowWaiter, async (req, res) => {
  const { tableId } = req.params;
  const waiterId = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if table exists and is available
    const tableCheck = await client.query(
      `SELECT id, table_number, status, assigned_waiter_id 
       FROM tables 
       WHERE id = $1`,
      [tableId]
    );
    
    if (tableCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    const table = tableCheck.rows[0];
    
    if (table.status !== 'available') {
      return res.status(400).json({ 
        success: false, 
        error: `Table ${table.table_number} is ${table.status}. Only available tables can be assigned.` 
      });
    }
    
    // Check if waiter already has too many tables (limit 5)
    const currentAssignments = await client.query(
      `SELECT COUNT(*) as count 
       FROM tables 
       WHERE assigned_waiter_id = $1 
         AND status IN ('available', 'occupied', 'reserved')`,
      [waiterId]
    );
    
    if (parseInt(currentAssignments.rows[0].count) >= 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'You already have 5 assigned tables. Please unassign some tables first.' 
      });
    }
    
    // Assign table to waiter
    await client.query(
      `UPDATE tables 
       SET assigned_waiter_id = $1, 
           assignment_date = CURRENT_DATE,
           assignment_method = 'self',
           assigned_by = $1,
           self_assigned = true,
           updated_at = NOW()
       WHERE id = $2`,
      [waiterId, tableId]
    );
    
    // Record self-assignment history
    await client.query(
      `INSERT INTO waiter_self_assignments (waiter_id, table_id, status)
       VALUES ($1, $2, 'active')`,
      [waiterId, tableId]
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
      message: `Table ${table.table_number} assigned to you successfully!`,
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
router.delete('/unassign-table/:tableId', protect, allowWaiter, async (req, res) => {
  const { tableId } = req.params;
  const waiterId = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const tableCheck = await client.query(
      `SELECT id, table_number, status, assigned_waiter_id 
       FROM tables 
       WHERE id = $1 AND assigned_waiter_id = $2`,
      [tableId, waiterId]
    );
    
    if (tableCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Table not found or not assigned to you' 
      });
    }
    
    const table = tableCheck.rows[0];
    
    if (table.status === 'occupied') {
      return res.status(400).json({ 
        success: false, 
        error: `Table ${table.table_number} is occupied. Cannot unassign until table is available.` 
      });
    }
    
    await client.query(
      `UPDATE tables 
       SET assigned_waiter_id = NULL, 
           assignment_date = NULL,
           assignment_method = NULL,
           self_assigned = false,
           updated_at = NOW()
       WHERE id = $1`,
      [tableId]
    );
    
    await client.query(
      `UPDATE waiter_self_assignments 
       SET unassigned_at = NOW(), status = 'inactive'
       WHERE table_id = $1 AND status = 'active'`,
      [tableId]
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
      message: `Table ${table.table_number} unassigned successfully!` 
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Unassign table error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==================== GET WAITER'S ASSIGNED TABLES ====================
router.get('/my-tables', protect, allowWaiter, async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      `SELECT t.*, 
              CASE WHEN t.self_assigned THEN 'Self-Assigned' ELSE 'Manager-Assigned' END as assignment_type,
              wsa.assigned_at
       FROM tables t
       LEFT JOIN waiter_self_assignments wsa ON t.id = wsa.table_id AND wsa.status = 'active'
       WHERE t.assigned_waiter_id = $1
       ORDER BY t.status = 'occupied' DESC, t.table_number ASC`,
      [waiterId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get my tables error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET WAITER'S TABLE STATS ====================
router.get('/my-stats', protect, allowWaiter, async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const stats = await pool.query(
      `SELECT 
         COUNT(*) as total_assigned,
         COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_tables,
         COUNT(CASE WHEN status = 'available' THEN 1 END) as available_tables,
         COUNT(CASE WHEN self_assigned = true THEN 1 END) as self_assigned_count
       FROM tables 
       WHERE assigned_waiter_id = $1`,
      [waiterId]
    );
    
    res.json({ success: true, data: stats.rows[0] });
  } catch (err) {
    console.error('Get waiter stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET WAITER'S ACTIVE ORDERS ====================
router.get('/my-orders', protect, allowWaiter, async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status,
              o.customer_name, o.table_id, o.created_at,
              t.table_number,
              COALESCE(
                json_agg(
                  json_build_object(
                    'name', p.name,
                    'quantity', oi.quantity,
                    'price', oi.unit_price
                  )
                ) FILTER (WHERE p.id IS NOT NULL), 
                '[]'
              ) as items
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE t.assigned_waiter_id = $1
         AND o.status NOT IN ('completed', 'cancelled')
       GROUP BY o.id, t.table_number
       ORDER BY o.created_at DESC`,
      [waiterId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get waiter orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;