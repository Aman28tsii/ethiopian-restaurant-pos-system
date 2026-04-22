import { query } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';

// Get main dashboard data
export const getDashboardData = catchAsync(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Today's stats
  const todayStats = await query(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(profit), 0) as total_profit,
      COALESCE(AVG(total_amount), 0) as average_order
    FROM sales
    WHERE DATE(created_at) = $1 AND status = 'completed'
  `, [today]);
  
  // Week stats
  const weekStats = await query(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(profit), 0) as total_profit
    FROM sales
    WHERE DATE(created_at) >= $1 AND status = 'completed'
  `, [weekAgo]);
  
  // Month stats
  const monthStats = await query(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(profit), 0) as total_profit
    FROM sales
    WHERE DATE(created_at) >= $1 AND status = 'completed'
  `, [monthAgo]);
  
  // Expenses for month
  const monthExpenses = await query(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    WHERE expense_date >= $1
  `, [monthAgo]);
  
  // Net profit (profit - expenses)
  const netProfit = parseFloat(monthStats.rows[0].total_profit) - parseFloat(monthExpenses.rows[0].total_expenses);
  
  // Low stock ingredients
  const lowStock = await query(`
    SELECT COUNT(*) as count
    FROM ingredients
    WHERE quantity <= min_stock
  `);
  
  // Out of stock
  const outOfStock = await query(`
    SELECT COUNT(*) as count
    FROM ingredients
    WHERE quantity = 0
  `);
  
  // Total products
  const totalProducts = await query(`
    SELECT COUNT(*) as count
    FROM products
    WHERE is_available = true
  `);
  
  // Top 5 products
  const topProducts = await query(`
    SELECT 
      p.id,
      p.name,
      SUM(si.quantity) as quantity_sold,
      SUM(si.total_price) as revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.created_at) >= $1
    AND s.status = 'completed'
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  `, [monthAgo]);
  
  // Recent sales (last 10)
  const recentSales = await query(`
    SELECT s.id, s.sale_number, s.total_amount, s.payment_method, s.created_at, u.name as cashier_name
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.status = 'completed'
    ORDER BY s.created_at DESC
    LIMIT 10
  `);
  
  // Daily sales for chart (last 7 days)
  const dailySales = await query(`
    SELECT 
      DATE(created_at) as date,
      COALESCE(SUM(total_amount), 0) as revenue,
      COALESCE(SUM(profit), 0) as profit,
      COUNT(*) as orders
    FROM sales
    WHERE DATE(created_at) >= $1
    AND status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [weekAgo]);
  
  res.json({
    success: true,
    data: {
      today: {
        orders: parseInt(todayStats.rows[0].total_orders),
        revenue: parseFloat(todayStats.rows[0].total_revenue),
        profit: parseFloat(todayStats.rows[0].total_profit),
        average_order: parseFloat(todayStats.rows[0].average_order)
      },
      week: {
        orders: parseInt(weekStats.rows[0].total_orders),
        revenue: parseFloat(weekStats.rows[0].total_revenue),
        profit: parseFloat(weekStats.rows[0].total_profit)
      },
      month: {
        orders: parseInt(monthStats.rows[0].total_orders),
        revenue: parseFloat(monthStats.rows[0].total_revenue),
        profit: parseFloat(monthStats.rows[0].total_profit),
        expenses: parseFloat(monthExpenses.rows[0].total_expenses),
        net_profit: netProfit
      },
      inventory: {
        low_stock: parseInt(lowStock.rows[0].count),
        out_of_stock: parseInt(outOfStock.rows[0].count),
        total_products: parseInt(totalProducts.rows[0].count)
      },
      top_products: topProducts.rows,
      recent_sales: recentSales.rows,
      daily_sales: dailySales.rows
    }
  });
});

// Get chart data for dashboard (ONLY ONE COPY - KEEP THIS)
export const getChartData = catchAsync(async (req, res) => {
  const { period = 'week' } = req.query;
  
  let days;
  switch(period) {
    case 'week':
      days = 7;
      break;
    case 'month':
      days = 30;
      break;
    case 'year':
      days = 365;
      break;
    default:
      days = 7;
  }
  
  // Daily sales data
  const salesData = await query(`
    SELECT 
      DATE(created_at) as date,
      COALESCE(SUM(total_amount), 0) as revenue,
      COALESCE(SUM(profit), 0) as profit,
      COUNT(*) as orders
    FROM sales
    WHERE created_at >= NOW() - INTERVAL '${days} days'
      AND status = 'completed'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  
  // Top 5 products
  const topProducts = await query(`
    SELECT 
      p.name,
      SUM(si.quantity) as total_sold,
      SUM(si.total_price) as revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.created_at >= NOW() - INTERVAL '30 days'
      AND s.status = 'completed'
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  `);
  
  // Payment methods breakdown
  const paymentMethods = await query(`
    SELECT 
      payment_method,
      COUNT(*) as count,
      SUM(total_amount) as total
    FROM sales
    WHERE created_at >= NOW() - INTERVAL '30 days'
      AND status = 'completed'
      AND payment_method IS NOT NULL
    GROUP BY payment_method
  `);
  
  // Hourly sales (last 7 days)
  const hourlyData = await query(`
    SELECT 
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as orders,
      SUM(total_amount) as revenue
    FROM sales
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND status = 'completed'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour ASC
  `);
  
  res.json({
    success: true,
    data: {
      sales: salesData.rows,
      top_products: topProducts.rows,
      payment_methods: paymentMethods.rows,
      hourly: hourlyData.rows,
      period: period
    }
  });
});