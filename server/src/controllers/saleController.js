import { query, getClient } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// Generate unique sale number
const generateSaleNumber = () => {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SALE-${timestamp}${random}`;
};

// Calculate cost of a product based on its recipe
const calculateProductCost = async (productId, quantity, client) => {
  const recipeResult = await client.query(
    `SELECT r.quantity_required, i.unit_cost
     FROM recipes r
     JOIN ingredients i ON r.ingredient_id = i.id
     WHERE r.product_id = $1`,
    [productId]
  );
  
  let totalCost = 0;
  for (const item of recipeResult.rows) {
    totalCost += parseFloat(item.quantity_required) * parseFloat(item.unit_cost) * quantity;
  }
  return totalCost;
};

// Deduct ingredient stock when product is sold
const deductIngredients = async (productId, quantity, client) => {
  const recipeResult = await client.query(
    `SELECT r.ingredient_id, r.quantity_required, i.quantity as current_stock, i.name
     FROM recipes r
     JOIN ingredients i ON r.ingredient_id = i.id
     WHERE r.product_id = $1`,
    [productId]
  );
  
  for (const item of recipeResult.rows) {
    const requiredAmount = parseFloat(item.quantity_required) * quantity;
    
    if (parseFloat(item.current_stock) < requiredAmount) {
      throw new AppError(
        `Insufficient stock for ingredient: ${item.name}. Required: ${requiredAmount}, Available: ${item.current_stock}`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }
    
    await client.query(
      `UPDATE ingredients 
       SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [requiredAmount, item.ingredient_id]
    );
  }
};

// Create new sale (POST /api/sales)
export const createSale = catchAsync(async (req, res) => {
  const { items, payment_method, customer_name, customer_phone } = req.body;
  const userId = req.user?.id || 1;
  const businessId = 1;
  
  if (!items || items.length === 0) {
    throw new AppError('No items in sale', 400, 'EMPTY_SALE');
  }
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    let totalAmount = 0;
    let totalCost = 0;
    const saleItems = [];
    
    for (const item of items) {
      const productResult = await client.query(
        `SELECT id, name, price FROM products WHERE id = $1 AND is_available = true`,
        [item.product_id]
      );
      
      if (productResult.rows.length === 0) {
        throw new AppError(`Product ${item.product_id} not found`, 404, 'PRODUCT_NOT_FOUND');
      }
      
      const product = productResult.rows[0];
      const quantity = item.quantity;
      const unitPrice = parseFloat(product.price);
      const itemTotal = unitPrice * quantity;
      const itemCost = await calculateProductCost(item.product_id, quantity, client);
      
      totalAmount += itemTotal;
      totalCost += itemCost;
      
      saleItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        cost: itemCost
      });
      
      await deductIngredients(item.product_id, quantity, client);
    }
    
    const profit = totalAmount - totalCost;
    const saleNumber = generateSaleNumber();
    
    const saleResult = await client.query(
      `INSERT INTO sales (business_id, user_id, sale_number, total_amount, total_cost, profit, payment_method, customer_name, customer_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')
       RETURNING id, sale_number, created_at`,
      [businessId, userId, saleNumber, totalAmount, totalCost, profit, payment_method, customer_name, customer_phone]
    );
    
    const saleId = saleResult.rows[0].id;
    
    for (const item of saleItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: {
        sale_id: saleId,
        sale_number: saleNumber,
        total_amount: totalAmount,
        total_cost: totalCost,
        profit: profit,
        profit_margin: totalAmount > 0 ? (profit / totalAmount * 100).toFixed(2) : 0,
        payment_method: payment_method,
        items: saleItems,
        created_at: saleResult.rows[0].created_at
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Get sales history (GET /api/sales)
export const getSales = catchAsync(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let sql = `
    SELECT s.*, u.name as cashier_name,
           COUNT(si.id) as item_count
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
    WHERE s.status = 'completed'
  `;
  const params = [];
  let paramIndex = 1;
  
  if (startDate) {
    sql += ` AND DATE(s.created_at) >= $${paramIndex++}`;
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ` AND DATE(s.created_at) <= $${paramIndex++}`;
    params.push(endDate);
  }
  
  sql += ` GROUP BY s.id, u.name ORDER BY s.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(parseInt(limit), offset);
  
  const result = await query(sql, params);
  
  const countResult = await query('SELECT COUNT(*) FROM sales WHERE status = $1', ['completed']);
  
  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    }
  });
});

// Get single sale details (GET /api/sales/:id)
export const getSaleById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const saleResult = await query(
    `SELECT s.*, u.name as cashier_name
     FROM sales s
     LEFT JOIN users u ON s.user_id = u.id
     WHERE s.id = $1`,
    [id]
  );
  
  if (saleResult.rows.length === 0) {
    throw new AppError('Sale not found', 404, 'SALE_NOT_FOUND');
  }
  
  const itemsResult = await query(
    `SELECT si.*, p.name as product_name, p.category
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     WHERE si.sale_id = $1`,
    [id]
  );
  
  res.json({
    success: true,
    data: {
      ...saleResult.rows[0],
      items: itemsResult.rows
    }
  });
});

// Get today's sales summary (GET /api/sales/today)
export const getTodaySales = catchAsync(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await query(
    `SELECT 
       COUNT(*) as total_orders,
       COALESCE(SUM(total_amount), 0) as total_revenue,
       COALESCE(SUM(profit), 0) as total_profit,
       COALESCE(AVG(total_amount), 0) as average_order
     FROM sales
     WHERE DATE(created_at) = $1 AND status = 'completed'`,
    [today]
  );
  
  res.json({
    success: true,
    data: result.rows[0],
    date: today
  });
});