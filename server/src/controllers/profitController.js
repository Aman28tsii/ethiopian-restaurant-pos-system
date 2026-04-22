import { query } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';

// Get profit report for date range
export const getProfitReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }
  
  // Main profit summary
  const summaryResult = await query(`
    SELECT 
      COUNT(*) as total_sales,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(total_cost), 0) as total_cost,
      COALESCE(SUM(profit), 0) as total_profit,
      AVG(total_amount) as average_order_value,
      AVG(profit) as average_profit_per_order,
      CASE 
        WHEN SUM(total_amount) > 0 
        THEN ROUND((SUM(profit) / SUM(total_amount)) * 100, 2)
        ELSE 0 
      END as profit_margin
    FROM sales
    WHERE DATE(created_at) BETWEEN $1 AND $2
    AND status = 'completed'
  `, [startDate, endDate]);
  
  // Daily breakdown
  const dailyResult = await query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as sales_count,
      SUM(total_amount) as revenue,
      SUM(total_cost) as cost,
      SUM(profit) as profit,
      ROUND((SUM(profit) / NULLIF(SUM(total_amount), 0)) * 100, 2) as profit_margin
    FROM sales
    WHERE DATE(created_at) BETWEEN $1 AND $2
    AND status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [startDate, endDate]);
  
  // Top products by profit
  const topProductsResult = await query(`
    SELECT 
      p.id,
      p.name,
      p.category,
      SUM(si.quantity) as quantity_sold,
      SUM(si.total_price) as revenue,
      COALESCE(SUM(r.quantity_required * i.unit_cost * si.quantity), 0) as cost,
      SUM(si.total_price) - COALESCE(SUM(r.quantity_required * i.unit_cost * si.quantity), 0) as profit,
      ROUND((SUM(si.total_price) - COALESCE(SUM(r.quantity_required * i.unit_cost * si.quantity), 0)) / NULLIF(SUM(si.total_price), 0) * 100, 2) as profit_margin
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN recipes r ON p.id = r.product_id
    LEFT JOIN ingredients i ON r.ingredient_id = i.id
    WHERE DATE(s.created_at) BETWEEN $1 AND $2
    AND s.status = 'completed'
    GROUP BY p.id, p.name, p.category
    ORDER BY profit DESC
    LIMIT 10
  `, [startDate, endDate]);
  
  // Profit by payment method
  const paymentMethodResult = await query(`
    SELECT 
      payment_method,
      COUNT(*) as transaction_count,
      SUM(total_amount) as revenue,
      SUM(profit) as profit,
      ROUND((SUM(profit) / NULLIF(SUM(total_amount), 0)) * 100, 2) as profit_margin
    FROM sales
    WHERE DATE(created_at) BETWEEN $1 AND $2
    AND status = 'completed'
    GROUP BY payment_method
    ORDER BY profit DESC
  `, [startDate, endDate]);
  
  // Profit by category
  const categoryResult = await query(`
    SELECT 
      p.category,
      SUM(si.quantity) as items_sold,
      SUM(si.total_price) as revenue,
      COALESCE(SUM(r.quantity_required * i.unit_cost * si.quantity), 0) as cost,
      SUM(si.total_price) - COALESCE(SUM(r.quantity_required * i.unit_cost * si.quantity), 0) as profit,
      ROUND((SUM(si.total_price) - COALESCE(SUM(r.quantity_required * i.unit_cost * si.quantity), 0)) / NULLIF(SUM(si.total_price), 0) * 100, 2) as profit_margin
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN recipes r ON p.id = r.product_id
    LEFT JOIN ingredients i ON r.ingredient_id = i.id
    WHERE DATE(s.created_at) BETWEEN $1 AND $2
    AND s.status = 'completed'
    GROUP BY p.category
    ORDER BY profit DESC
  `, [startDate, endDate]);
  
  res.json({
    success: true,
    data: {
      period: { startDate, endDate },
      summary: summaryResult.rows[0] || {
        total_sales: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        average_order_value: 0,
        average_profit_per_order: 0,
        profit_margin: 0
      },
      daily_breakdown: dailyResult.rows,
      top_products: topProductsResult.rows,
      by_payment_method: paymentMethodResult.rows,
      by_category: categoryResult.rows
    }
  });
});

// Get today's profit snapshot
export const getTodayProfit = catchAsync(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await query(`
    SELECT 
      COUNT(*) as orders,
      SUM(total_amount) as revenue,
      SUM(total_cost) as cost,
      SUM(profit) as profit,
      ROUND((SUM(profit) / NULLIF(SUM(total_amount), 0)) * 100, 2) as profit_margin,
      AVG(total_amount) as average_order
    FROM sales
    WHERE DATE(created_at) = $1
    AND status = 'completed'
  `, [today]);
  
  // Hourly breakdown for today
  const hourlyResult = await query(`
    SELECT 
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as orders,
      SUM(total_amount) as revenue,
      SUM(profit) as profit
    FROM sales
    WHERE DATE(created_at) = $1
    AND status = 'completed'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour ASC
  `, [today]);
  
  res.json({
    success: true,
    data: {
      date: today,
      summary: result.rows[0] || {
        orders: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        profit_margin: 0,
        average_order: 0
      },
      hourly: hourlyResult.rows
    }
  });
});

// Get monthly profit trend
export const getMonthlyTrend = catchAsync(async (req, res) => {
  const { months = 6 } = req.query;
  
  const result = await query(`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as orders,
      SUM(total_amount) as revenue,
      SUM(total_cost) as cost,
      SUM(profit) as profit,
      ROUND((SUM(profit) / NULLIF(SUM(total_amount), 0)) * 100, 2) as profit_margin
    FROM sales
    WHERE created_at >= NOW() - INTERVAL '${months} months'
    AND status = 'completed'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month ASC
  `);
  
  res.json({
    success: true,
    data: result.rows
  });
});