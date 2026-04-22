import express from 'express';
import { protect, allowKitchen } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Kitchen route is working!' });
});

// Get kitchen orders
router.get('/orders', protect, allowKitchen, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ko.id,
        ko.order_id,
        ko.status,
        ko.created_at,
        o.order_number,
        o.customer_name,
        o.table_id,
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
      FROM kitchen_orders ko
      JOIN orders o ON ko.order_id = o.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ko.status IN ('pending', 'preparing')
      GROUP BY ko.id, o.order_number, o.customer_name, o.table_id, ko.status, ko.created_at
      ORDER BY 
        CASE ko.status
          WHEN 'pending' THEN 1
          WHEN 'preparing' THEN 2
        END,
        ko.created_at ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Kitchen orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update order status - SIMPLIFIED WORKING VERSION
router.put('/orders/:orderId/status', protect, allowKitchen, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  console.log(`🔧 Updating order ${orderId} to status: ${status}`);
  
  // Validate status
  const validStatuses = ['preparing', 'ready', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }
  
  try {
    // Simple update without complex CASE statements
    let updateQuery = 'UPDATE kitchen_orders SET status = $1, updated_at = NOW()';
    let queryParams = [status, orderId];
    
    if (status === 'preparing') {
      updateQuery = 'UPDATE kitchen_orders SET status = $1, started_at = NOW(), updated_at = NOW() WHERE order_id = $2 RETURNING *';
    } else if (status === 'ready') {
      updateQuery = 'UPDATE kitchen_orders SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE order_id = $2 RETURNING *';
    }
    
    const result = await pool.query(updateQuery, [status, orderId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order ${orderId} not found` });
    }
    
    // Also update main orders table if ready
    if (status === 'ready') {
      await pool.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', ['ready', orderId]);
    }
    
    console.log(`✅ Order ${orderId} updated to ${status}`);
    
    res.json({ 
      success: true, 
      message: `Order ${orderId} status updated to ${status}`,
      data: result.rows[0]
    });
    
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get completed orders
router.get('/completed', protect, allowKitchen, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ko.order_id,
        ko.status,
        ko.completed_at,
        o.order_number,
        o.total_amount
      FROM kitchen_orders ko
      JOIN orders o ON ko.order_id = o.id
      WHERE ko.status IN ('ready', 'completed')
      ORDER BY ko.completed_at DESC
      LIMIT 30
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Completed orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;