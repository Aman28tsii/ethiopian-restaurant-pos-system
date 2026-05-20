import express from 'express';
import { protect, allowWaiter, allowOwner } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// ==================== GET WAITER'S ASSIGNED TABLES ====================
router.get('/my-tables', protect, allowWaiter, async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    // Check if waiter has shift assignment for today
    const shiftResult = await pool.query(
      `SELECT * FROM waiter_shifts 
       WHERE waiter_id = $1 
       AND shift_date = CURRENT_DATE 
       AND is_active = true`,
      [waiterId]
    );
    
    let assignedTables = [];
    
    if (shiftResult.rows.length > 0) {
      const tableIds = shiftResult.rows[0].table_ids;
      const tablesResult = await pool.query(
        `SELECT t.*, u.name as waiter_name
         FROM tables t
         LEFT JOIN users u ON t.assigned_waiter_id = u.id
         WHERE t.id = ANY($1::int[])
         ORDER BY t.table_number`,
        [tableIds]
      );
      assignedTables = tablesResult.rows;
    } else {
      const tablesResult = await pool.query(
        `SELECT t.*, u.name as waiter_name
         FROM tables t
         LEFT JOIN users u ON t.assigned_waiter_id = u.id
         WHERE t.assigned_waiter_id = $1
         ORDER BY t.table_number`,
        [waiterId]
      );
      assignedTables = tablesResult.rows;
    }
    
    res.json({ success: true, data: assignedTables });
  } catch (err) {
    console.error('Get my tables error:', err);
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
       WHERE (t.assigned_waiter_id = $1 
              OR o.waiter_id = $1
              OR EXISTS (
                SELECT 1 FROM waiter_shifts ws 
                WHERE ws.waiter_id = $1 
                AND ws.shift_date = CURRENT_DATE 
                AND t.id = ANY(ws.table_ids)
              ))
         AND o.status NOT IN ('completed', 'cancelled', 'pending_confirmation')
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

// ==================== GET PENDING CONFIRMATIONS ====================
router.get('/pending-confirmations', protect, allowWaiter, async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.total_amount, o.customer_name, o.customer_phone, 
              o.table_id, o.notes, o.created_at, o.status,
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
       WHERE o.status = 'pending_confirmation' 
         AND o.source = 'qr_menu'
         AND (t.assigned_waiter_id = $1 
              OR EXISTS (
                SELECT 1 FROM waiter_shifts ws 
                WHERE ws.waiter_id = $1 
                AND ws.shift_date = CURRENT_DATE 
                AND t.id = ANY(ws.table_ids)
              ))
       GROUP BY o.id, t.table_number
       ORDER BY o.created_at ASC`,
      [waiterId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get pending confirmations error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ASSIGN TABLES TO WAITER ====================
router.post('/assign-tables', protect, allowOwner, async (req, res) => {
  const { waiter_id, table_ids, shift_date, shift_start, shift_end } = req.body;
  
  if (!waiter_id || !table_ids || table_ids.length === 0) {
    return res.status(400).json({ success: false, error: 'Waiter ID and table IDs required' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(
      `UPDATE waiter_shifts 
       SET is_active = false 
       WHERE waiter_id = $1 AND shift_date = COALESCE($2, CURRENT_DATE)`,
      [waiter_id, shift_date || null]
    );
    
    const result = await client.query(
      `INSERT INTO waiter_shifts (waiter_id, table_ids, shift_date, shift_start, shift_end, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [waiter_id, table_ids, shift_date || new Date().toISOString().split('T')[0], shift_start || '08:00', shift_end || '22:00']
    );
    
    for (const tableId of table_ids) {
      await client.query(
        `UPDATE tables 
         SET assigned_waiter_id = $1, assignment_date = $2
         WHERE id = $3`,
        [waiter_id, shift_date || new Date().toISOString().split('T')[0], tableId]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Tables assigned to waiter successfully`,
      data: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assign tables error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==================== GET WAITER'S CURRENT SHIFT ====================
router.get('/my-shift', protect, allowWaiter, async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      `SELECT ws.*, 
              json_agg(json_build_object('id', t.id, 'number', t.table_number, 'status', t.status)) as tables
       FROM waiter_shifts ws
       JOIN UNNEST(ws.table_ids) AS table_id ON TRUE
       JOIN tables t ON t.id = table_id
       WHERE ws.waiter_id = $1 
         AND ws.shift_date = CURRENT_DATE 
         AND ws.is_active = true
       GROUP BY ws.id`,
      [waiterId]
    );
    
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Get my shift error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;