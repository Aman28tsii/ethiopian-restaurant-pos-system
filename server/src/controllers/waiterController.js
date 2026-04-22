import { query, getClient } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';

// Generate unique order number
const generateOrderNumber = () => {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
};

// Create order (Waiter only - no payment)
export const createOrder = catchAsync(async (req, res) => {
  const { 
    items, customer_name, customer_phone, 
    table_id, order_type = 'dine_in', notes 
  } = req.body;
  
  const userId = req.user.id;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Order must have at least one item' });
  }
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, name, price FROM products WHERE id = $1 AND is_available = true',
        [item.product_id]
      );
      
      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      
      const product = productResult.rows[0];
      const quantity = item.quantity;
      const unitPrice = parseFloat(product.price);
      const itemTotal = unitPrice * quantity;
      
      totalAmount += itemTotal;
      
      orderItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity,
        unit_price: unitPrice,
        total_price: itemTotal
      });
    }
    
    const orderNumber = generateOrderNumber();
    
    const orderResult = await client.query(`
      INSERT INTO orders (
        order_number, total_amount, items_count, created_by, status, 
        payment_status, customer_name, customer_phone, table_id, 
        order_type, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'pending', 'pending', $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, order_number, total_amount, status
    `, [
      orderNumber, totalAmount, orderItems.length, userId, 
      customer_name || null, customer_phone || null, 
      table_id || null, order_type, notes || null
    ]);
    
    const orderId = orderResult.rows[0].id;
    
    for (const item of orderItems) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, item.product_id, item.quantity, item.unit_price, item.total_price]);
    }
    
    await client.query(`
      INSERT INTO kitchen_orders (order_id, status, notes)
      VALUES ($1, 'pending', $2)
    `, [orderId, notes || null]);
    
    if (table_id && order_type === 'dine_in') {
      await client.query(`
        UPDATE tables SET status = 'occupied', current_order_id = $1 WHERE id = $2
      `, [orderId, table_id]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Order created and sent to kitchen',
      data: {
        order_id: orderId,
        order_number: orderNumber,
        total_amount: totalAmount,
        status: 'pending',
        items: orderItems
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get waiter's own orders
export const getMyOrders = catchAsync(async (req, res) => {
  const userId = req.user.id;
  
  const result = await query(`
    SELECT 
      o.id, 
      o.order_number, 
      o.total_amount, 
      o.status, 
      o.payment_status,
      o.customer_name, 
      o.table_id,
      t.table_number,
      o.created_at,
      COALESCE((SELECT COUNT(*) FROM order_items WHERE order_id = o.id), 0) as item_count
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    WHERE o.created_by = $1
      AND o.status NOT IN ('completed', 'cancelled')
    ORDER BY o.created_at DESC
  `, [userId]);
  
  res.json({ success: true, data: result.rows });
});

// Get order details
export const getOrderDetails = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  
  const orderResult = await query(`
    SELECT o.*, t.table_number, u.name as waiter_name
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.id = $1
  `, [orderId]);
  
  if (orderResult.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  
  const itemsResult = await query(`
    SELECT oi.*, p.name as product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `, [orderId]);
  
  res.json({
    success: true,
    data: {
      ...orderResult.rows[0],
      items: itemsResult.rows
    }
  });
});

// Add items to existing order
export const addOrderItems = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'No items to add' });
  }
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const orderCheck = await client.query(
      'SELECT status, payment_status FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = orderCheck.rows[0];
    if (order.status !== 'pending') {
      throw new Error('Cannot add items to order that is already being prepared');
    }
    
    let additionalAmount = 0;
    
    for (const item of items) {
      const productResult = await client.query(
        'SELECT price FROM products WHERE id = $1',
        [item.product_id]
      );
      
      const unitPrice = parseFloat(productResult.rows[0].price);
      const itemTotal = unitPrice * item.quantity;
      additionalAmount += itemTotal;
      
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, item.product_id, item.quantity, unitPrice, itemTotal]);
    }
    
    await client.query(`
      UPDATE orders 
      SET total_amount = total_amount + $1,
          items_count = items_count + $2,
          updated_at = NOW()
      WHERE id = $3
    `, [additionalAmount, items.length, orderId]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Items added to order',
      additional_amount: additionalAmount
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add items error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Cancel order
export const cancelOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const orderCheck = await client.query(
      'SELECT status, payment_status, table_id FROM orders WHERE id = $1 AND created_by = $2',
      [orderId, userId]
    );
    
    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found or does not belong to you');
    }
    
    const order = orderCheck.rows[0];
    
    if (order.payment_status === 'paid') {
      throw new Error('Cannot cancel a paid order');
    }
    
    if (order.status === 'completed') {
      throw new Error('Order already completed');
    }
    
    await client.query(`
      UPDATE orders 
      SET status = 'cancelled', 
          updated_at = CURRENT_TIMESTAMP,
          cancellation_reason = $1
      WHERE id = $2
    `, [reason || 'Cancelled by waiter', orderId]);
    
    await client.query(`
      UPDATE kitchen_orders 
      SET status = 'cancelled', 
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1
    `, [orderId]);
    
    if (order.table_id) {
      await client.query(`
        UPDATE tables 
        SET status = 'available', 
            current_order_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [order.table_id]);
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Order cancelled successfully',
      data: { order_id: orderId }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});