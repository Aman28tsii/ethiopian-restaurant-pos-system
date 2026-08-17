import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import rateLimit from 'express-rate-limit';
import { processOrderStockDeduction } from '../controllers/recipeController.js';

const router = express.Router();

// Rate limiter for public tracking endpoint
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please wait.' }
});

// Generate unique sale number
const generateSaleNumber = function() {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return 'SALE-' + timestamp + random;
};

// ============================================
// PUBLIC ROUTES
// ============================================

// Track order by order number (Public)
router.get('/track/:orderNumber', trackLimiter, async (req, res) => {
  const { orderNumber } = req.params;
  
  try {
    const orderResult = await pool.query(
      'SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.customer_name, o.customer_phone, o.table_id, o.order_type, o.notes, o.created_at, o.updated_at, o.waiter_id, o.confirmed_at, t.table_number FROM orders o LEFT JOIN tables t ON o.table_id = t.id WHERE o.order_number = $1',
      [orderNumber]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    const itemsResult = await pool.query(
      'SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price, p.name as product_name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1',
      [order.id]
    );
    
    const wastageResult = await pool.query(
      'SELECT SUM(st.wastage_amount * i.unit_cost) as total_wastage_cost, COUNT(st.id) as wastage_entries FROM stock_transactions st JOIN ingredients i ON st.ingredient_id = i.id WHERE st.order_id = $1',
      [order.id]
    );
    
    res.json({
      success: true,
      data: {
        ...order,
        items: itemsResult.rows,
        wastage: wastageResult.rows[0] || { total_wastage_cost: 0, wastage_entries: 0 }
      }
    });
    
  } catch (err) {
    console.error('Track order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// PUBLIC QR ORDER ROUTE
// ============================================
router.post('/qr-order', async (req, res) => {
  try {
    const { items, table_id, customer_name, customer_phone, notes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in order' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const tableResult = await client.query(
        'SELECT waiter_id FROM tables WHERE id = $1',
        [table_id]
      );
      const waiterId = tableResult.rows[0]?.waiter_id;
      
      let totalAmount = 0;
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price FROM products WHERE id = $1',
          [item.product_id]
        );
        totalAmount += parseFloat(productResult.rows[0].price) * item.quantity;
      }
      
      const orderNumber = 'QR-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
      
      const orderResult = await client.query(
        'INSERT INTO orders (order_number, total_amount, status, payment_status, customer_name, customer_phone, table_id, order_type, notes, source, waiter_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, order_number',
        [orderNumber, totalAmount, 'pending_confirmation', 'pending', customer_name || null, customer_phone || null, table_id || null, 'dine_in', notes || null, 'qr_menu', waiterId]
      );
      
      const orderId = orderResult.rows[0].id;
      
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price, name FROM products WHERE id = $1',
          [item.product_id]
        );
        const itemTotal = parseFloat(productResult.rows[0].price) * item.quantity;
        
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [orderId, item.product_id, item.quantity, productResult.rows[0].price, itemTotal]
        );
      }
      
      if (table_id) {
        await client.query(
          'UPDATE tables SET status = $1, pending_order_id = $2 WHERE id = $3',
          ['available', orderId, table_id]
        );
      }
      
      await client.query('COMMIT');
      
      const io = req.app.get('io');
      if (io && waiterId) {
        io.to('waiter_' + waiterId).emit('new_pending_order', {
          order_id: orderId,
          order_number: orderNumber,
          table_id: table_id,
          customer_name: customer_name || 'Walk-in Customer',
          total_amount: totalAmount
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Order placed! Waiting for waiter confirmation.',
        data: {
          order_id: orderId,
          order_number: orderNumber,
          total_amount: totalAmount,
          status: 'pending_confirmation'
        }
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('QR order error:', err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('QR order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// WAITER ROUTES - WITH STOCK DEDUCTION
// ============================================

// Create order with stock deduction
router.post('/', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  try {
    const { items, customer_name, customer_phone, table_id, order_type = 'dine_in', notes, source = 'waiter' } = req.body;
    const userId = req.user.id;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order must have at least one item' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let totalAmount = 0;
      
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price FROM products WHERE id = $1',
          [item.product_id]
        );
        totalAmount += parseFloat(productResult.rows[0].price) * item.quantity;
      }
      
      const orderNumber = 'ORD-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
      
      const orderResult = await client.query(
        'INSERT INTO orders (order_number, total_amount, created_by, status, payment_status, customer_name, customer_phone, table_id, order_type, notes, source, waiter_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, order_number, total_amount',
        [orderNumber, totalAmount, userId, 'pending', 'pending', customer_name || null, customer_phone || null, table_id || null, order_type, notes || null, source, userId]
      );
      
      const orderId = orderResult.rows[0].id;
      
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price FROM products WHERE id = $1',
          [item.product_id]
        );
        const itemTotal = parseFloat(productResult.rows[0].price) * item.quantity;
        
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [orderId, item.product_id, item.quantity, productResult.rows[0].price, itemTotal]
        );
      }
      
      await client.query(
        'INSERT INTO kitchen_orders (order_id, status, notes) VALUES ($1, $2, $3)',
        [orderId, 'pending', notes || null]
      );
      
      if (table_id && order_type === 'dine_in') {
        await client.query(
          'UPDATE tables SET status = $1, current_order_id = $2 WHERE id = $3',
          ['occupied', orderId, table_id]
        );
      }
      
      let stockResult = { deductions: [], totalWastageCost: 0 };
      try {
        stockResult = await processOrderStockDeduction(orderId, items, client);
        console.log('Stock deduction completed. Total wastage cost: ' + stockResult.totalWastageCost);
      } catch (stockError) {
        console.warn('Stock deduction warning:', stockError.message);
      }
      
      await client.query('COMMIT');
      
      const io = req.app.get('io');
      if (io) {
        io.emit('new_order', {
          order_id: orderId,
          order_number: orderNumber,
          table_id: table_id,
          source: source
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Order created and sent to kitchen',
        data: {
          order_id: orderId,
          order_number: orderNumber,
          total_amount: totalAmount,
          stock_deductions: stockResult.deductions,
          total_wastage_cost: stockResult.totalWastageCost
        }
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Create order error:', err);
      res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add items to existing order
router.post('/:orderId/add-items', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'No items to add' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const orderCheck = await client.query(
      'SELECT status, payment_status, total_amount FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderCheck.rows[0];
    
    if (order.payment_status === 'paid') {
      throw new Error('Cannot add items to a paid order');
    }
    
    if (order.status === 'completed') {
      throw new Error('Order already completed');
    }
    
    let additionalAmount = 0;
    const newItems = [];
    
    for (const item of items) {
      const productResult = await client.query(
        'SELECT price, name FROM products WHERE id = $1',
        [item.product_id]
      );
      
      const unitPrice = parseFloat(productResult.rows[0].price);
      const itemTotal = unitPrice * item.quantity;
      additionalAmount += itemTotal;
      
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
        [orderId, item.product_id, item.quantity, unitPrice, itemTotal]
      );
      
      newItems.push(item);
    }
    
    let stockResult = { deductions: [], totalWastageCost: 0 };
    try {
      stockResult = await processOrderStockDeduction(orderId, newItems, client);
    } catch (stockError) {
      console.warn('Stock deduction warning:', stockError.message);
    }
    
    const newTotal = parseFloat(order.total_amount) + additionalAmount;
    
    await client.query(
      'UPDATE orders SET total_amount = $1, updated_at = NOW() WHERE id = $2',
      [newTotal, orderId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Items added to order',
      additional_amount: additionalAmount,
      new_total: newTotal,
      stock_deductions: stockResult.deductions,
      total_wastage_cost: stockResult.totalWastageCost
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add items error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ============================================
// CASHIER ROUTES
// ============================================

// Get orders ready for payment
router.get('/ready', protect, restrictTo('cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT o.id, o.order_number, o.total_amount, o.customer_name, o.table_id, t.table_number, o.created_at, ko.status as kitchen_status, (SELECT COUNT(*) FROM stock_transactions WHERE order_id = o.id) as has_wastage FROM orders o LEFT JOIN tables t ON o.table_id = t.id JOIN kitchen_orders ko ON o.id = ko.order_id WHERE ko.status = $1 AND o.payment_status = $2 AND o.status != $3 ORDER BY o.created_at ASC',
      ['ready', 'pending', 'completed']
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Ready orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Process payment
router.post('/:orderId/pay', protect, restrictTo('cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const { orderId } = req.params;
  const { payment_method } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const orderResult = await client.query(
      'SELECT o.*, ko.status as kitchen_status FROM orders o JOIN kitchen_orders ko ON o.id = ko.order_id WHERE o.id = $1',
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
    
    await client.query(
      'UPDATE orders SET payment_status = $1, payment_method = $2, status = $3, updated_at = NOW() WHERE id = $4',
      ['paid', payment_method, 'completed', orderId]
    );
    
    if (order.table_id) {
      await client.query(
        'UPDATE tables SET status = $1, current_order_id = NULL, updated_at = NOW() WHERE id = $2',
        ['available', order.table_id]
      );
    }
    
    const saleNumber = generateSaleNumber();
    await client.query(
      'INSERT INTO sales (sale_number, order_id, total_amount, payment_method, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [saleNumber, orderId, order.total_amount, payment_method, 'completed']
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: { sale_number: saleNumber, order_id: orderId, total_amount: order.total_amount }
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ============================================
// KITCHEN ROUTES
// ============================================

// Get kitchen orders
router.get('/kitchen', protect, restrictTo('kitchen', 'manager', 'owner', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT ko.id, ko.order_id, ko.status, ko.created_at, o.order_number, o.customer_name, o.table_id, t.table_number, COALESCE(json_agg(json_build_object($1, p.name, $2, oi.quantity)) FILTER (WHERE p.id IS NOT NULL), $3) as items FROM kitchen_orders ko JOIN orders o ON ko.order_id = o.id LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id LEFT JOIN tables t ON o.table_id = t.id WHERE ko.status IN ($4, $5) GROUP BY ko.id, o.order_number, o.customer_name, o.table_id, ko.status, ko.created_at, t.table_number ORDER BY CASE ko.status WHEN $6 THEN 1 WHEN $7 THEN 2 END, ko.created_at ASC',
      ['name', 'quantity', '[]', 'pending', 'preparing', 'pending', 'preparing']
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Kitchen orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update kitchen order status
router.put('/kitchen/:orderId/status', protect, restrictTo('kitchen', 'manager', 'owner', 'admin'), async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'UPDATE kitchen_orders SET status = $1, started_at = CASE WHEN $2 = $3 AND status = $4 THEN NOW() ELSE started_at END, completed_at = CASE WHEN $5 = $6 THEN NOW() ELSE completed_at END, updated_at = NOW() WHERE order_id = $7 RETURNING *',
      [status, status, 'preparing', 'pending', status, 'ready', orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const orderDetails = await client.query(
      'SELECT o.order_number, o.table_id, o.waiter_id, t.table_number FROM orders o LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = $1',
      [orderId]
    );
    
    if (status === 'ready') {
      await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        ['ready', orderId]
      );
    }
    
    await client.query('COMMIT');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', {
        order_id: orderId,
        status: status,
        message: 'Order #' + orderDetails.rows[0].order_number + ' is now ' + status
      });
      
      if (status === 'ready' && orderDetails.rows[0].waiter_id) {
        io.to('waiter_' + orderDetails.rows[0].waiter_id).emit('order_ready_for_waiter', {
          order_id: orderId,
          order_number: orderDetails.rows[0].order_number,
          table_number: orderDetails.rows[0].table_number,
          message: 'Order #' + orderDetails.rows[0].order_number + ' for Table ' + orderDetails.rows[0].table_number + ' is ready!'
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Order status updated to ' + status,
      data: result.rows[0]
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update kitchen order error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ============================================
// OTHER ROUTES
// ============================================

// Get pending confirmation orders
router.get('/pending-confirmation', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const waiterId = req.user.id;
  
  try {
    const result = await pool.query(
      'SELECT o.id, o.order_number, o.total_amount, o.customer_name, o.customer_phone, o.table_id, o.notes, o.created_at, o.status, t.table_number, COALESCE(json_agg(json_build_object($1, p.name, $2, oi.quantity, $3, oi.unit_price)) FILTER (WHERE p.id IS NOT NULL), $4) as items FROM orders o JOIN tables t ON o.table_id = t.id LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id WHERE o.status = $5 AND (o.waiter_id = $6 OR o.waiter_id IS NULL) AND o.source = $7 GROUP BY o.id, t.table_number ORDER BY o.created_at ASC',
      ['name', 'quantity', 'price', '[]', 'pending_confirmation', waiterId, 'qr_menu']
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get pending confirmation orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Confirm order
router.put('/confirm/:orderId', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const orderCheck = await client.query(
      'SELECT o.id, o.status, o.table_id, o.customer_name, o.order_number, o.waiter_id FROM orders o WHERE o.id = $1 AND o.status = $2',
      [orderId, 'pending_confirmation']
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or already confirmed'
      });
    }
    
    const order = orderCheck.rows[0];
    
    if (!order.waiter_id) {
      await client.query(
        'UPDATE orders SET waiter_id = $1 WHERE id = $2',
        [userId, orderId]
      );
      order.waiter_id = userId;
    }
    
    if (order.waiter_id && order.waiter_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'This order is not assigned to you'
      });
    }
    
    await client.query(
      'UPDATE orders SET status = $1, confirmed_by = $2, confirmed_at = NOW(), updated_at = NOW() WHERE id = $3',
      ['pending', userId, orderId]
    );
    
    await client.query(
      'INSERT INTO kitchen_orders (order_id, status, notes) VALUES ($1, $2, $3)',
      [orderId, 'pending', 'Order confirmed by waiter']
    );
    
    if (order.table_id) {
      await client.query(
        'UPDATE tables SET status = $1, current_order_id = $2, pending_order_id = NULL, updated_at = NOW() WHERE id = $3',
        ['occupied', orderId, order.table_id]
      );
    }
    
    await client.query('COMMIT');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('order_confirmed', {
        order_id: orderId,
        order_number: order.order_number,
        status: 'confirmed',
        waiter_id: userId,
        message: 'Order #' + order.order_number + ' has been confirmed'
      });
      io.emit('new_order', {
        order_id: orderId,
        order_number: order.order_number,
        status: 'pending',
        customer_name: order.customer_name,
        table_id: order.table_id
      });
    }
    
    res.json({
      success: true,
      message: 'Order confirmed and sent to kitchen',
      data: { order_id: orderId, status: 'pending' }
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Confirm order error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// Get waiter's orders
router.get('/my-orders', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const userId = req.user.id;
  
  try {
    const result = await pool.query(
      'SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.customer_name, o.table_id, o.created_at, t.table_number, COALESCE(json_agg(json_build_object($1, p.name, $2, oi.quantity, $3, oi.unit_price)) FILTER (WHERE p.id IS NOT NULL), $4) as items FROM orders o JOIN tables t ON o.table_id = t.id LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id WHERE o.waiter_id = $5 AND o.status NOT IN ($6, $7, $8) GROUP BY o.id, t.table_number ORDER BY o.created_at DESC',
      ['name', 'quantity', 'price', '[]', userId, 'completed', 'cancelled', 'pending_confirmation']
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get waiter orders error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel order
router.put('/:orderId/cancel', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const orderCheck = await client.query(
      'SELECT status, payment_status, table_id FROM orders WHERE id = $1 AND waiter_id = $2',
      [orderId, userId]
    );
    
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found or does not belong to you');
    }
    
    const order = orderCheck.rows[0];
    
    if (order.payment_status === 'paid') {
      throw new Error('Cannot cancel a paid order. Please process refund instead.');
    }
    
    if (order.status === 'completed') {
      throw new Error('Order already completed');
    }
    
    await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW(), cancellation_reason = $2 WHERE id = $3',
      ['cancelled', reason || 'Cancelled by staff', orderId]
    );
    
    await client.query(
      'UPDATE kitchen_orders SET status = $1, updated_at = NOW() WHERE order_id = $2',
      ['cancelled', orderId]
    );
    
    if (order.table_id) {
      await client.query(
        'UPDATE tables SET status = $1, current_order_id = NULL, pending_order_id = NULL, updated_at = NOW() WHERE id = $2',
        ['available', order.table_id]
      );
    }
    
    await client.query('COMMIT');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('order_cancelled', {
        order_id: orderId,
        status: 'cancelled',
        message: 'Order has been cancelled'
      });
    }
    
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

// Get active order for table
router.get('/table/:tableId/active-order', protect, restrictTo('waiter', 'cashier', 'manager', 'owner', 'admin'), async (req, res) => {
  const { tableId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT id, order_number, total_amount, status, payment_status, created_at FROM orders WHERE table_id = $1 AND status NOT IN ($2, $3) AND payment_status != $4 ORDER BY created_at DESC LIMIT 1',
      [tableId, 'completed', 'cancelled', 'paid']
    );
    
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Get active order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public: Customer adds items to existing order
router.post('/:orderId/customer-add-items', async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'No items to add' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const orderCheck = await client.query(
      'SELECT id, status, total_amount FROM orders WHERE id = $1 AND status = $2',
      [orderId, 'pending_confirmation']
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or already confirmed'
      });
    }
    
    const order = orderCheck.rows[0];
    let additionalAmount = 0;
    
    for (const item of items) {
      const productResult = await client.query(
        'SELECT price, name FROM products WHERE id = $1',
        [item.product_id]
      );
      
      const unitPrice = parseFloat(productResult.rows[0].price);
      const itemTotal = unitPrice * item.quantity;
      additionalAmount += itemTotal;
      
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
        [orderId, item.product_id, item.quantity, unitPrice, itemTotal]
      );
    }
    
    const newTotal = parseFloat(order.total_amount) + additionalAmount;
    
    await client.query(
      'UPDATE orders SET total_amount = $1, updated_at = NOW() WHERE id = $2',
      [newTotal, orderId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Items added to order',
      additional_amount: additionalAmount,
      new_total: newTotal
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Customer add items error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// Get wastage for order
router.get('/:orderId/wastage', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
  const { orderId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT st.ingredient_id, i.name as ingredient_name, i.unit, st.expected_quantity, st.actual_quantity, st.wastage_amount, st.wastage_percentage, st.created_at, (st.wastage_amount * i.unit_cost) as wastage_cost, p.name as product_name FROM stock_transactions st JOIN ingredients i ON st.ingredient_id = i.id LEFT JOIN products p ON st.product_id = p.id WHERE st.order_id = $1 ORDER BY st.wastage_amount DESC',
      [orderId]
    );
    
    const summary = await pool.query(
      'SELECT SUM(st.wastage_amount * i.unit_cost) as total_wastage_cost, SUM(st.wastage_amount) as total_wastage_quantity, AVG(st.wastage_percentage) as avg_wastage_percentage FROM stock_transactions st JOIN ingredients i ON st.ingredient_id = i.id WHERE st.order_id = $1',
      [orderId]
    );
    
    res.json({
      success: true,
      data: {
        details: result.rows,
        summary: summary.rows[0] || { total_wastage_cost: 0, total_wastage_quantity: 0, avg_wastage_percentage: 0 }
      }
    });
  } catch (err) {
    console.error('Get wastage report error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
