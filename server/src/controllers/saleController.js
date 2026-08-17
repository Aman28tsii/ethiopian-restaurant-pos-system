import { query, getClient } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';
import { processOrderStockDeduction } from './recipeController.js';

// Generate unique sale number
const generateSaleNumber = function() {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return 'SALE-' + timestamp + random;
};

// Create new sale (POST /api/sales)
export const createSale = catchAsync(async function(req, res) {
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
    const saleItems = [];
    
    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, name, price FROM products WHERE id = $1 AND is_available = true',
        [item.product_id]
      );
      
      if (productResult.rows.length === 0) {
        throw new AppError('Product ' + item.product_id + ' not found', 404, 'PRODUCT_NOT_FOUND');
      }
      
      const product = productResult.rows[0];
      const quantity = item.quantity;
      const unitPrice = parseFloat(product.price);
      const itemTotal = unitPrice * quantity;
      
      totalAmount += itemTotal;
      
      saleItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: itemTotal
      });
    }
    
    const saleNumber = generateSaleNumber();
    
    const saleResult = await client.query(
      'INSERT INTO sales (business_id, user_id, sale_number, total_amount, payment_method, customer_name, customer_phone, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, sale_number, created_at',
      [businessId, userId, saleNumber, totalAmount, payment_method, customer_name, customer_phone, 'completed']
    );
    
    const saleId = saleResult.rows[0].id;
    
    for (const item of saleItems) {
      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
        [saleId, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
    }
    
    let stockResult = { deductions: [], totalWastageCost: 0 };
    try {
      const orderItems = items.map(function(item) {
        return {
          product_id: item.product_id,
          quantity: item.quantity
        };
      });
      
      stockResult = await processOrderStockDeduction(saleId, orderItems, client);
      console.log('Stock deduction completed for sale ' + saleId + '. Total wastage cost: ' + stockResult.totalWastageCost);
    } catch (stockError) {
      console.warn('Stock deduction warning:', stockError.message);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: {
        sale_id: saleId,
        sale_number: saleNumber,
        total_amount: totalAmount,
        payment_method: payment_method,
        items: saleItems,
        created_at: saleResult.rows[0].created_at,
        stock_deductions: stockResult.deductions,
        total_wastage_cost: stockResult.totalWastageCost
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Get sales history
export const getSales = catchAsync(async function(req, res) {
  const { startDate, endDate, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let sql = 'SELECT s.*, u.name as cashier_name, COUNT(si.id) as item_count FROM sales s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN sale_items si ON s.id = si.sale_id WHERE s.status = $1';
  const params = ['completed'];
  let paramIndex = 2;
  
  if (startDate) {
    sql += ' AND DATE(s.created_at) >= $' + paramIndex++;
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ' AND DATE(s.created_at) <= $' + paramIndex++;
    params.push(endDate);
  }
  
  sql += ' GROUP BY s.id, u.name ORDER BY s.created_at DESC LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex++;
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

// Get single sale details
export const getSaleById = catchAsync(async function(req, res) {
  const { id } = req.params;
  
  const saleResult = await query(
    'SELECT s.*, u.name as cashier_name FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = $1',
    [id]
  );
  
  if (saleResult.rows.length === 0) {
    throw new AppError('Sale not found', 404, 'SALE_NOT_FOUND');
  }
  
  const itemsResult = await query(
    'SELECT si.*, p.name as product_name, p.category FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = $1',
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

// Get today's sales summary - FIXED
export const getTodaySales = catchAsync(async function(req, res) {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await query(
    'SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue, COALESCE(SUM(profit), 0) as total_profit, COALESCE(AVG(total_amount), 0) as average_order FROM sales WHERE DATE(created_at) = $1 AND status = $2',
    [today, 'completed']
  );
  
  res.json({
    success: true,
    data: result.rows[0],
    date: today
  });
});
