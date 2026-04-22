import { pool } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';

// Get orders for kitchen display
export const getKitchenOrders = catchAsync(async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ko.id as kitchen_order_id,
        ko.order_id,
        ko.status,
        ko.started_at,
        ko.created_at as kitchen_created_at,
        o.order_number,
        o.table_id,
        t.table_number,
        o.customer_name,
        o.notes,
        o.created_at as order_created_at,
        EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 60 as minutes_waiting,
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
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ko.status IN ('pending', 'preparing')
      GROUP BY ko.id, o.order_number, t.table_number, o.customer_name, o.notes, o.created_at
      ORDER BY 
        CASE ko.status
          WHEN 'pending' THEN 1
          WHEN 'preparing' THEN 2
        END,
        o.created_at ASC
    `);
    
    const orders = result.rows.map(order => ({
      ...order,
      minutes_waiting: Math.round(parseFloat(order.minutes_waiting) || 0),
      is_overdue: (parseFloat(order.minutes_waiting) || 0) > 20
    }));
    
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Kitchen orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update order status in kitchen
export const updateKitchenStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  
  const validStatuses = ['preparing', 'ready', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }
  
  try {
    const result = await pool.query(`
      UPDATE kitchen_orders 
      SET status = $1,
          started_at = CASE 
            WHEN $1 = 'preparing' AND status = 'pending' THEN CURRENT_TIMESTAMP 
            ELSE started_at 
          END,
          completed_at = CASE 
            WHEN $1 = 'ready' THEN CURRENT_TIMESTAMP 
            ELSE completed_at 
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $2
      RETURNING order_id, status, started_at, completed_at
    `, [status, orderId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found in kitchen' });
    }
    
    if (status === 'ready') {
      await pool.query(`
        UPDATE orders 
        SET status = 'ready', prepared_by = $1, updated_at = NOW()
        WHERE id = $2
      `, [userId, orderId]);
    }
    
    // WebSocket emit
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', {
        order_id: orderId,
        status: status,
        message: `📋 Order #${orderId} is now ${status}`,
        timestamp: new Date().toISOString()
      });
      console.log(`📡 WebSocket emitted: order_status_updated to ${status}`);
    }
    
    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: result.rows[0]
    });
    
  } catch (err) {
    console.error('Update kitchen order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get completed orders (for history)
export const getCompletedOrders = catchAsync(async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ko.order_id,
        ko.status,
        ko.completed_at,
        o.order_number,
        o.total_amount,
        t.table_number
      FROM kitchen_orders ko
      JOIN orders o ON ko.order_id = o.id
      LEFT JOIN tables t ON o.table_id = t.id
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

// Get kitchen statistics
export const getKitchenStats = catchAsync(async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_count,
        COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_count,
        AVG(CASE 
          WHEN status = 'ready' AND started_at IS NOT NULL AND completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 60 
        END) as avg_prep_time
      FROM kitchen_orders
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});