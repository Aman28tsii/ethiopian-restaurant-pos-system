import express from 'express';
import { protect, allowWaiter, allowCashier, allowKitchen, allowManager, allowOwner } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for public tracking endpoint
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please wait.' }
});

// Generate unique sale number
const generateSaleNumber = () => {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SALE-${timestamp}${random}`;
};

// ==================== PUBLIC ROUTES ====================

// Track order by order number (Public - no authentication needed)
router.get('/track/:orderNumber', trackLimiter, async (req, res) => {
  const { orderNumber } = req.params;
  
  try {
    const orderResult = await pool.query(
      `SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, 
              o.customer_name, o.customer_phone, o.table_id, o.order_type, o.notes,
              o.created_at, o.updated_at, o.waiter_id, o.confirmed_at,
              t.table_number
       FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE o.order_number = $1`,
      [orderNumber]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
              p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [order.id]
    );
    
    res.json({
      success: true,
      data: { ...order, items: itemsResult.rows }
    });
    
  } catch (err) {
    console.error('Track order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== PUBLIC QR ORDER ROUTE ====================
router.post('/qr-order', async (req, res) => {
  try {
    const { items, table_id, customer_name, customer_phone, notes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in order' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get table info including waiter_id
      const tableResult = await client.query(
        'SELECT waiter_id FROM tables WHERE id = $1',
        [table_id]
      );
      const waiterId = tableResult.rows[0]?.waiter_id;
      
      // Calculate total
      let totalAmount = 0;
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price FROM products WHERE id = $1',
          [item.product_id]
        );
        totalAmount += parseFloat(productResult.rows[0].price) * item.quantity;
      }
      
      const orderNumber = `QR-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
      
      const orderResult = await client.query(
        `INSERT INTO orders (order_number, total_amount, status, payment_status, customer_name, customer_phone, table_id, order_type, notes, source, waiter_id)
         VALUES ($1, $2, 'pending_confirmation', 'pending', $3, $4, $5, 'dine_in', $6, 'qr_menu', $7)
         RETURNING id, order_number`,
        [orderNumber, totalAmount, customer_name || null, customer_phone || null, table_id || null, notes || null, waiterId]
      );
      
      const orderId = orderResult.rows[0].id;
      
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price, name FROM products WHERE id = $1',
          [item.product_id]
        );
        const itemTotal = parseFloat(productResult.rows[0].price) * item.quantity;
        
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, item.product_id, item.quantity, productResult.rows[0].price, itemTotal]
        );
      }
      
      if (table_id) {
        await client.query(
          `UPDATE tables SET status = 'available', pending_order_id = $1 WHERE id = $2`,
          [orderId, table_id]
        );
      }
      
      await client.query('COMMIT');
      
      const io = req.app.get('io');
      if (io && waiterId) {
        io.to(`waiter_${waiterId}`).emit('new_pending_order', {
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

// ==================== WAITER CONFIRMATION ROUTE ====================
router.put('/confirm/:orderId', protect, allowWaiter, async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const orderCheck = await client.query(
      `SELECT o.id, o.status, o.table_id, o.customer_name, o.order_number, o.waiter_id
       FROM orders o
       WHERE o.id = $1 AND o.status = $2`,
      [orderId, 'pending_confirmation']
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found or already confirmed' 
      });
    }
    
    const order = orderCheck.rows[0];
    
    // ✅ FIX: Set waiter_id if not already set (moved AFTER order is defined)
    if (!order.waiter_id) {
      await client.query(
        `UPDATE orders SET waiter_id = $1 WHERE id = $2`,
        [userId, orderId]
      );
      order.waiter_id = userId;
    }
    
    // Verify this order belongs to the waiter
    if (order.waiter_id && order.waiter_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'This order is not assigned to you' 
      });
    }
    
    await client.query(
      `UPDATE orders 
       SET status = 'pending', 
           confirmed_by = $1, 
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [userId, orderId]
    );
    
    await client.query(
      `INSERT INTO kitchen_orders (order_id, status, notes)
       VALUES ($1, 'pending', $2)`,
      [orderId, 'Order confirmed by waiter']
    );
    
    if (order.table_id) {
      await client.query(
        `UPDATE tables 
         SET status = 'occupied', 
             current_order_id = $1, 
             pending_order_id = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [orderId, order.table_id]
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
        message: `Order #${order.order_number} has been confirmed`
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

// ==================== GET PENDING CONFIRMATION ORDERS ====================
router.get('/pending-confirmation', protect, allowWaiter, async (req, res) => {
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
         AND (o.waiter_id = $1 OR o.waiter_id IS NULL)
         AND o.source = 'qr_menu'
       GROUP BY o.id, t.table_number
       ORDER BY o.created_at ASC`,
      [waiterId]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get pending confirmation orders error:', err);
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
       WHERE o.waiter_id = $1
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

// ==================== KITCHEN ROUTES ====================

router.get('/kitchen', protect, allowKitchen, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ko.id, ko.order_id, ko.status, ko.created_at,
        o.order_number, o.customer_name, o.table_id,
        t.table_number,
        COALESCE(
          json_agg(
            json_build_object(
              'name', p.name,
              'quantity', oi.quantity
            )
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'
        ) as items
      FROM kitchen_orders ko
      JOIN orders o ON ko.order_id = o.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE ko.status IN ('pending', 'preparing')
      GROUP BY ko.id, o.order_number, o.customer_name, o.table_id, ko.status, ko.created_at, t.table_number
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

router.put('/kitchen/:orderId/status', protect, allowKitchen, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      `UPDATE kitchen_orders 
       SET status = $1,
           started_at = CASE WHEN $1 = 'preparing' AND status = 'pending' THEN NOW() ELSE started_at END,
           completed_at = CASE WHEN $1 = 'ready' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE order_id = $2
       RETURNING *`,
      [status, orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const orderDetails = await client.query(
      `SELECT o.order_number, o.table_id, o.waiter_id, t.table_number
       FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE o.id = $1`,
      [orderId]
    );
    
    if (status === 'ready') {
      await client.query(
        `UPDATE orders SET status = 'ready', updated_at = NOW() WHERE id = $1`,
        [orderId]
      );
    }
    
    await client.query('COMMIT');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', {
        order_id: orderId,
        status: status,
        message: `Order #${orderDetails.rows[0].order_number} is now ${status}`
      });
      
      if (status === 'ready' && orderDetails.rows[0].waiter_id) {
        io.to(`waiter_${orderDetails.rows[0].waiter_id}`).emit('order_ready_for_waiter', {
          order_id: orderId,
          order_number: orderDetails.rows[0].order_number,
          table_number: orderDetails.rows[0].table_number,
          message: `🍽️ Order #${orderDetails.rows[0].order_number} for Table ${orderDetails.rows[0].table_number} is ready!`
        });
      }
    }
    
    res.json({
      success: true,
      message: `Order status updated to ${status}`,
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

// ==================== TABLE STATUS MANAGEMENT ====================

router.get('/tables/all', protect, allowWaiter, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.table_number, t.capacity, t.status, t.waiter_id,
              u.name as waiter_name,
              o.order_number as current_order_number
       FROM tables t
       LEFT JOIN users u ON t.waiter_id = u.id
       LEFT JOIN orders o ON t.current_order_id = o.id
       ORDER BY t.table_number ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get tables error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/tables/:tableId/status', protect, allowWaiter, async (req, res) => {
  const { tableId } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['available', 'reserved', 'cleaning', 'occupied'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }
  
  try {
    const result = await pool.query(
      `UPDATE tables 
       SET status = $1, 
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, table_number, status`,
      [status, tableId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_updated', {
        table_id: tableId,
        table_number: result.rows[0].table_number,
        status: status
      });
    }
    
    res.json({ 
      success: true, 
      message: `Table ${result.rows[0].table_number} status updated to ${status}`,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Update table status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== OWNER ROUTES ====================

router.get('/waiters', protect, allowOwner, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email FROM users WHERE role = 'waiter' ORDER BY name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get waiters error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/tables/:tableId/assign-waiter', protect, allowOwner, async (req, res) => {
  const { tableId } = req.params;
  const { waiter_id } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE tables SET waiter_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, table_number, waiter_id`,
      [waiter_id, tableId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Assign waiter error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

//// ==================== WAITER MANUAL ORDER ROUTE ====================
router.post('/', protect, allowWaiter, async (req, res) => {
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
      
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
      
      const orderResult = await client.query(
        `INSERT INTO orders (order_number, total_amount, created_by, status, payment_status, customer_name, customer_phone, table_id, order_type, notes, source, waiter_id)
         VALUES ($1, $2, $3, 'pending', 'pending', $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, order_number, total_amount`,
        [orderNumber, totalAmount, userId, customer_name || null, customer_phone || null, table_id || null, order_type, notes || null, source, userId]
      );
      
      const orderId = orderResult.rows[0].id;
      
      // Insert order items
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price FROM products WHERE id = $1',
          [item.product_id]
        );
        const itemTotal = parseFloat(productResult.rows[0].price) * item.quantity;
        
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, item.product_id, item.quantity, productResult.rows[0].price, itemTotal]
        );
      }
      
      // ==================== INVENTORY DEDUCTION ====================
      // Deduct ingredients from inventory based on recipes
      for (const item of items) {
        // Get recipe for this product
        const recipeResult = await client.query(
          `SELECT r.ingredient_id, r.quantity_required, i.name, i.quantity as current_stock
           FROM recipes r
           JOIN ingredients i ON r.ingredient_id = i.id
           WHERE r.product_id = $1`,
          [item.product_id]
        );
        
        // Deduct each ingredient
        for (const recipe of recipeResult.rows) {
          const requiredAmount = parseFloat(recipe.quantity_required) * item.quantity;
          const newStock = parseFloat(recipe.current_stock) - requiredAmount;
          
          // Check if enough stock
          if (newStock < 0) {
            throw new Error(`Insufficient stock for ingredient: ${recipe.name}. Required: ${requiredAmount}, Available: ${recipe.current_stock}`);
          }
          
          // Update inventory
          await client.query(
            `UPDATE ingredients 
             SET quantity = quantity - $1, 
                 updated_at = NOW()
             WHERE id = $2`,
            [requiredAmount, recipe.ingredient_id]
          );
        }
      }
      // ==================== END INVENTORY DEDUCTION ====================
      
      await client.query(
        `INSERT INTO kitchen_orders (order_id, status, notes)
         VALUES ($1, 'pending', $2)`,
        [orderId, notes || null]
      );
      
      if (table_id && order_type === 'dine_in') {
        await client.query(
          `UPDATE tables SET status = 'occupied', current_order_id = $1 WHERE id = $2`,
          [orderId, table_id]
        );
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
        data: orderResult.rows[0]
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

// ==================== GET ACTIVE ORDER FOR TABLE ====================
router.get('/table/:tableId/active-order', protect, allowWaiter, async (req, res) => {
  const { tableId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT id, order_number, total_amount, status, payment_status, created_at
       FROM orders 
       WHERE table_id = $1 
         AND status NOT IN ('completed', 'cancelled')
         AND payment_status != 'paid'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [tableId]
    );
    
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Get active order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ADD ITEMS TO EXISTING ORDER ====================
router.post('/:orderId/add-items', protect, allowWaiter, async (req, res) => {
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
    
    for (const item of items) {
      const productResult = await client.query(
        'SELECT price, name FROM products WHERE id = $1',
        [item.product_id]
      );
      
      const unitPrice = parseFloat(productResult.rows[0].price);
      const itemTotal = unitPrice * item.quantity;
      additionalAmount += itemTotal;
      
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.quantity, unitPrice, itemTotal]
      );
    }
    
    const newTotal = parseFloat(order.total_amount) + additionalAmount;
    
    await client.query(
      `UPDATE orders 
       SET total_amount = $1, updated_at = NOW()
       WHERE id = $2`,
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
    console.error('Add items error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==================== CASHIER ROUTES ====================

router.get('/ready', protect, allowCashier, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id, o.order_number, o.total_amount, o.customer_name, o.table_id,
        t.table_number, o.created_at,
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

router.post('/:orderId/pay', protect, allowCashier, async (req, res) => {
  const { orderId } = req.params;
  const { payment_method } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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
    
    await client.query(
      `UPDATE orders 
       SET payment_status = 'paid', payment_method = $1, status = 'completed', updated_at = NOW()
       WHERE id = $2`,
      [payment_method, orderId]
    );
    
    if (order.table_id) {
      await client.query(
        `UPDATE tables 
         SET status = 'available', current_order_id = NULL, updated_at = NOW()
         WHERE id = $1`,
        [order.table_id]
      );
    }
    
    const saleNumber = generateSaleNumber();
    await client.query(
      `INSERT INTO sales (sale_number, order_id, total_amount, payment_method, status, created_at)
       VALUES ($1, $2, $3, $4, 'completed', NOW())`,
      [saleNumber, orderId, order.total_amount, payment_method]
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

// ==================== MANAGER ROUTES ====================

router.get('/:orderId', protect, allowManager, async (req, res) => {
  try {
    const orderResult = await pool.query(
      `SELECT o.*, t.table_number, u.name as waiter_name
       FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = $1`,
      [req.params.orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [req.params.orderId]
    );
    
    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CANCEL ORDER ====================
router.put('/:orderId/cancel', protect, allowWaiter, async (req, res) => {
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
      `UPDATE orders 
       SET status = 'cancelled', updated_at = NOW(), cancellation_reason = $1
       WHERE id = $2`,
      [reason || 'Cancelled by staff', orderId]
    );
    
    await client.query(
      `UPDATE kitchen_orders 
       SET status = 'cancelled', updated_at = NOW()
       WHERE order_id = $1`,
      [orderId]
    );
    
    if (order.table_id) {
      await client.query(
        `UPDATE tables 
         SET status = 'available', current_order_id = NULL, pending_order_id = NULL, updated_at = NOW()
         WHERE id = $1`,
        [order.table_id]
      );
    }
    
    await client.query('COMMIT');
    
    const io = req.app.get('io');
    if (io) {
      io.emit('order_cancelled', {
        order_id: orderId,
        status: 'cancelled',
        message: `Order has been cancelled`
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
// ==================== PUBLIC: Customer adds items to existing order ====================
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
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.quantity, unitPrice, itemTotal]
      );
    }
    
    const newTotal = parseFloat(order.total_amount) + additionalAmount;
    
    await client.query(
      `UPDATE orders 
       SET total_amount = $1, updated_at = NOW()
       WHERE id = $2`,
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
// After successfully adding items and committing, add:
const io = req.app.get('io');
if (io) {
  io.emit('order_items_added', {
    order_id: orderId,
    order_number: orderNumber,
    new_total: newTotal
  });
}
export default router;