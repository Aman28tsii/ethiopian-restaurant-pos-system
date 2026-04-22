import { pool } from '../config/database.js';

class OrderService {
  // Create order (for WAITER)
  static async createOrder(orderData) {
    const { 
      items, customer_name, customer_phone, 
      table_number, order_type = 'dine_in', notes,
      created_by 
    } = orderData;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Calculate total
      let totalAmount = 0;
      for (const item of items) {
        const product = await client.query(
          'SELECT price FROM products WHERE id = $1',
          [item.product_id]
        );
        totalAmount += parseFloat(product.rows[0].price) * item.quantity;
      }
      
      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
      
      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders 
         (order_number, total_amount, items_count, staff_id, status, payment_status, 
          customer_name, customer_phone, table_number, order_type, notes)
         VALUES ($1, $2, $3, $4, 'pending', 'pending', $5, $6, $7, $8, $9)
         RETURNING id, order_number`,
        [orderNumber, totalAmount, items.length, created_by, customer_name, customer_phone, 
         table_number, order_type, notes]
      );
      
      const orderId = orderResult.rows[0].id;
      
      // Add order items
      for (const item of items) {
        const product = await client.query(
          'SELECT price, name FROM products WHERE id = $1',
          [item.product_id]
        );
        const itemTotal = parseFloat(product.rows[0].price) * item.quantity;
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, item.product_id, item.quantity, product.rows[0].price, itemTotal]
        );
      }
      
      // Create kitchen order
      await client.query(
        `INSERT INTO kitchen_orders (order_id, status, notes)
         VALUES ($1, 'pending', $2)`,
        [orderId, notes]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        order: {
          id: orderId,
          order_number: orderNumber,
          status: 'pending',
          total_amount: totalAmount
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create order error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Get orders for kitchen
  static async getKitchenOrders() {
    const result = await pool.query(`
      SELECT 
        ko.id, ko.order_id, ko.status, ko.created_at,
        o.order_number, o.customer_name, o.table_number,
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
      WHERE ko.status IN ('pending', 'preparing')
      GROUP BY ko.id, o.order_number, o.customer_name, o.table_number, ko.status, ko.created_at
      ORDER BY 
        CASE ko.status
          WHEN 'pending' THEN 1
          WHEN 'preparing' THEN 2
        END,
        ko.created_at ASC
    `);
    
    return result.rows;
  }
  
  // Update kitchen order status
  static async updateKitchenStatus(orderId, status) {
    const result = await pool.query(
      `UPDATE kitchen_orders 
       SET status = $1,
           started_at = CASE WHEN $1 = 'preparing' AND status = 'pending' 
                         THEN CURRENT_TIMESTAMP ELSE started_at END,
           completed_at = CASE WHEN $1 = 'ready' 
                         THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $2
       RETURNING *`,
      [status, orderId]
    );
    
    return result.rows[0];
  }
  
  // Process payment (for CASHIER)
  static async processPayment(orderId, paymentMethod, customerName, customerPhone) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get order total
      const order = await client.query(
        'SELECT total_amount FROM orders WHERE id = $1',
        [orderId]
      );
      
      if (order.rows.length === 0) {
        throw new Error('Order not found');
      }
      
      // Update order
      const result = await client.query(
        `UPDATE orders 
         SET status = 'completed', 
             payment_status = 'paid',
             payment_method = $1,
             customer_name = COALESCE($2, customer_name),
             customer_phone = COALESCE($3, customer_phone),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [paymentMethod, customerName, customerPhone, orderId]
      );
      
      // Update kitchen order
      await client.query(
        `UPDATE kitchen_orders SET status = 'served' WHERE order_id = $1`,
        [orderId]
      );
      
      await client.query('COMMIT');
      
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Get orders ready for payment
  static async getReadyOrders() {
    const result = await pool.query(`
      SELECT 
        o.id, o.order_number, o.total_amount, o.customer_name, o.created_at,
        ko.status as kitchen_status
      FROM orders o
      JOIN kitchen_orders ko ON o.id = ko.order_id
      WHERE ko.status = 'ready' 
        AND o.payment_status = 'pending'
        AND o.status != 'completed'
      ORDER BY o.created_at ASC
    `);
    
    return result.rows;
  }
  
  // Get order details
  static async getOrderDetails(orderId) {
    const orderResult = await pool.query(`
      SELECT o.*, u.name as staff_name
      FROM orders o
      LEFT JOIN users u ON o.staff_id = u.id
      WHERE o.id = $1
    `, [orderId]);
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const itemsResult = await pool.query(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);
    
    const kitchenResult = await pool.query(`
      SELECT * FROM kitchen_orders WHERE order_id = $1
    `, [orderId]);
    
    return {
      ...orderResult.rows[0],
      items: itemsResult.rows,
      kitchen_status: kitchenResult.rows[0]
    };
  }
}

export default OrderService;