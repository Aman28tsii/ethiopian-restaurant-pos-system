import express from 'express';
import { protect, allowWaiter, allowCashier, allowKitchen, allowManager } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import OrderService from '../services/orderService.js';

const router = express.Router();

// Generate unique sale number
const generateSaleNumber = () => {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SALE-${timestamp}${random}`;
};

// ==================== WAITER ROUTES ====================
// Waiter: Create order
router.post('/', protect, allowWaiter, async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      created_by: req.user.id
    };
    const result = await OrderService.createOrder(orderData);
    res.status(201).json(result);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== KITCHEN ROUTES ====================
// Kitchen: Get orders
router.get('/kitchen', protect, allowKitchen, async (req, res) => {
  try {
    const orders = await OrderService.getKitchenOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kitchen: Update order status
router.put('/kitchen/:orderId/status', protect, allowKitchen, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  try {
    const result = await OrderService.updateKitchenStatus(orderId, status);
    res.json({ success: true, data: result, message: `Order status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CASHIER ROUTES ====================
// Cashier: Get ready orders for payment
router.get('/ready', protect, allowCashier, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.customer_name,
        o.table_id,
        t.table_number,
        o.created_at,
        ko.status as kitchen_status
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      JOIN kitchen_orders ko ON o.id = ko.order_id
      WHERE ko.status = 'ready' 
        AND o.payment_status = 'pending'
        AND o.status != 'completed'
      ORDER BY o.created_at ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Ready orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cashier: Process payment
router.post('/:orderId/pay', protect, allowCashier, async (req, res) => {
  const { orderId } = req.params;
  const { payment_method } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get order details
    const orderResult = await client.query(
      `SELECT o.*, ko.status as kitchen_status 
       FROM orders o
       JOIN kitchen_orders ko ON o.id = ko.order_id
       WHERE o.id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderResult.rows[0];
    
    if (order.kitchen_status !== 'ready') {
      throw new Error('Order is not ready for payment');
    }
    
    if (order.payment_status === 'paid') {
      throw new Error('Order already paid');
    }
    
    // Update order - set as paid and completed
    await client.query(
      `UPDATE orders 
       SET payment_status = 'paid',
           payment_method = $1,
           status = 'completed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [payment_method, orderId]
    );
    
    // UPDATE TABLE STATUS TO AVAILABLE (for dine-in orders)
    if (order.table_id) {
      await client.query(
        `UPDATE tables 
         SET status = 'available', 
             current_order_id = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [order.table_id]
      );
      console.log(`Table ${order.table_id} marked as available`);
    }
    
    // Create sale record with sale_number
    const saleNumber = generateSaleNumber();
    const saleResult = await client.query(
      `INSERT INTO sales (sale_number, order_id, total_amount, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, 'completed', NOW())
       RETURNING id`,
      [saleNumber, orderId, order.total_amount, payment_method]
    );
    
    // Add sale items
    const itemsResult = await client.query(
      `SELECT product_id, quantity, unit_price, total_price 
       FROM order_items 
       WHERE order_id = $1`,
      [orderId]
    );
    
    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleResult.rows[0].id, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      data: { 
        sale_number: saleNumber,
        order_id: orderId, 
        total_amount: order.total_amount, 
        payment_method,
        table_freed: order.table_id ? true : false,
        table_id: order.table_id
      }
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==================== MANAGER ROUTES ====================
// Get order details (Manager only)
router.get('/:orderId', protect, allowManager, async (req, res) => {
  try {
    const order = await OrderService.getOrderDetails(req.params.orderId);
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});
// Cancel order (Waiter or Manager)
router.put('/:orderId/cancel', protect, allowWaiter, async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if order can be cancelled
    const orderCheck = await client.query(
      'SELECT status, payment_status, table_id FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderCheck.rows[0];
    
    if (order.payment_status === 'paid') {
      throw new Error('Cannot cancel a paid order. Please process refund instead.');
    }
    
    if (order.status === 'completed') {
      throw new Error('Order already completed');
    }
    
    // Update order status with cancellation_reason
    await client.query(
      `UPDATE orders 
       SET status = 'cancelled', 
           updated_at = CURRENT_TIMESTAMP,
           cancellation_reason = $1
       WHERE id = $2`,
      [reason || 'Cancelled by staff', orderId]
    );
    
    // Update kitchen orders
    await client.query(
      `UPDATE kitchen_orders 
       SET status = 'cancelled', 
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $1`,
      [orderId]
    );
    
    // Free the table if occupied
    if (order.table_id) {
      await client.query(
        `UPDATE tables 
         SET status = 'available', 
             current_order_id = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [order.table_id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Order cancelled successfully',
      data: { order_id: orderId }
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});
export default router;