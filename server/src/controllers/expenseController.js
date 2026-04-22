import { query } from '../config/database.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

// Get all expenses
export const getAllExpenses = catchAsync(async (req, res) => {
  const { startDate, endDate, category, limit = 100, offset = 0 } = req.query;
  
  let sql = `
    SELECT e.*, u.name as created_by_name
    FROM expenses e
    LEFT JOIN users u ON e.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;
  
  if (startDate) {
    sql += ` AND e.expense_date >= $${paramIndex++}`;
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ` AND e.expense_date <= $${paramIndex++}`;
    params.push(endDate);
  }
  
  if (category) {
    sql += ` AND e.category = $${paramIndex++}`;
    params.push(category);
  }
  
  sql += ` ORDER BY e.expense_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(parseInt(limit), parseInt(offset));
  
  const result = await query(sql, params);
  
  // Get total count
  let countSql = 'SELECT COUNT(*) FROM expenses WHERE 1=1';
  const countParams = [];
  let countIndex = 1;
  
  if (startDate) {
    countSql += ` AND expense_date >= $${countIndex++}`;
    countParams.push(startDate);
  }
  if (endDate) {
    countSql += ` AND expense_date <= $${countIndex++}`;
    countParams.push(endDate);
  }
  if (category) {
    countSql += ` AND category = $${countIndex++}`;
    countParams.push(category);
  }
  
  const countResult = await query(countSql, countParams);
  
  res.json({
    success: true,
    data: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

// Get single expense
export const getExpenseById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(
    `SELECT e.*, u.name as created_by_name
     FROM expenses e
     LEFT JOIN users u ON e.user_id = u.id
     WHERE e.id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }
  
  res.json({ success: true, data: result.rows[0] });
});

// Create expense
export const createExpense = catchAsync(async (req, res) => {
  const { category, amount, description, expense_date } = req.body;
  const userId = req.user?.id || 1;
  const businessId = 1;
  
  if (!category || !amount || amount <= 0) {
    throw new AppError('Category and valid amount are required', 400);
  }
  
  const result = await query(
    `INSERT INTO expenses (business_id, user_id, category, amount, description, expense_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [businessId, userId, category, amount, description, expense_date || new Date().toISOString().split('T')[0]]
  );
  
  res.status(201).json({
    success: true,
    message: 'Expense recorded successfully',
    data: result.rows[0]
  });
});

// Update expense
export const updateExpense = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { category, amount, description, expense_date } = req.body;
  
  const result = await query(
    `UPDATE expenses 
     SET category = COALESCE($1, category),
         amount = COALESCE($2, amount),
         description = COALESCE($3, description),
         expense_date = COALESCE($4, expense_date)
     WHERE id = $5
     RETURNING *`,
    [category, amount, description, expense_date, id]
  );
  
  if (result.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Expense updated successfully',
    data: result.rows[0]
  });
});

// Delete expense
export const deleteExpense = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const result = await query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
  
  if (result.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Expense deleted successfully'
  });
});

// Get expense summary
export const getExpenseSummary = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    throw new AppError('startDate and endDate are required', 400);
  }
  
  // Total expenses
  const totalResult = await query(
    `SELECT 
       COUNT(*) as total_count,
       COALESCE(SUM(amount), 0) as total_amount
     FROM expenses
     WHERE expense_date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );
  
  // Breakdown by category
  const categoryResult = await query(
    `SELECT 
       category,
       COUNT(*) as count,
       COALESCE(SUM(amount), 0) as total_amount
     FROM expenses
     WHERE expense_date BETWEEN $1 AND $2
     GROUP BY category
     ORDER BY total_amount DESC`,
    [startDate, endDate]
  );
  
  // Daily breakdown
  const dailyResult = await query(
    `SELECT 
       expense_date as date,
       COUNT(*) as count,
       COALESCE(SUM(amount), 0) as total_amount
     FROM expenses
     WHERE expense_date BETWEEN $1 AND $2
     GROUP BY expense_date
     ORDER BY expense_date DESC`,
    [startDate, endDate]
  );
  
  res.json({
    success: true,
    data: {
      period: { startDate, endDate },
      summary: totalResult.rows[0],
      by_category: categoryResult.rows,
      daily: dailyResult.rows
    }
  });
});

// Get expense categories
export const getExpenseCategories = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT DISTINCT category FROM expenses ORDER BY category`
  );
  
  res.json({ success: true, data: result.rows.map(r => r.category) });
});