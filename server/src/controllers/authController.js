import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { catchAsync } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Login user
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  
  const result = await query(
    `SELECT id, name, email, password, role, status, is_active FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  
  const user = result.rows[0];
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }
  
  if (user.status === 'pending') {
    return res.status(403).json({ success: false, error: 'Account pending approval. Please wait.' });
  }
  
  if (!user.is_active || user.status === 'inactive') {
    return res.status(403).json({ success: false, error: 'Account deactivated. Contact admin.' });
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }
  
  await query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
  
  const token = generateToken(user);
  
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  });
});

// Signup
export const signup = catchAsync(async (req, res) => {
  const { name, email, password, phone } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email and password are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }
  
  const existingUser = await query('SELECT id, status FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  
  if (existingUser.rows.length > 0) {
    if (existingUser.rows[0].status === 'pending') {
      return res.status(400).json({ success: false, error: 'Account already pending approval' });
    }
    return res.status(400).json({ success: false, error: 'Email already registered' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const result = await query(
    `INSERT INTO users (business_id, name, email, password, role, phone, status, is_active)
     VALUES (1, $1, $2, $3, 'staff', $4, 'pending', false)
     RETURNING id, name, email, role, status, created_at`,
    [name.trim(), email.toLowerCase().trim(), hashedPassword, phone || null]
  );
  
  res.status(201).json({
    success: true,
    message: 'Account created! Waiting for admin approval.',
    user: result.rows[0]
  });
});

// Get pending users
export const getPendingUsers = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, name, email, phone, status, created_at
     FROM users WHERE status = 'pending'
     ORDER BY created_at ASC`
  );
  
  res.json({ success: true, data: result.rows });
});

// Approve user
export const approveUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role = 'staff' } = req.body;
  
  const result = await query(
    `UPDATE users 
     SET status = 'active', role = $1, is_active = true
     WHERE id = $2 AND status = 'pending'
     RETURNING id, name, email, role, status`,
    [role, id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'User not found or already approved' });
  }
  
  res.json({
    success: true,
    message: 'User approved successfully',
    user: result.rows[0]
  });
});

// Reject user
export const rejectUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(
    `DELETE FROM users WHERE id = $1 AND status = 'pending' RETURNING id`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  res.json({
    success: true,
    message: 'User rejected and removed'
  });
});

// Get all users
export const getAllUsers = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, name, email, role, phone, status, is_active, created_at, last_login
     FROM users ORDER BY created_at DESC`
  );
  
  res.json({ success: true, data: result.rows });
});

// Get current user
export const getCurrentUser = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = $1`,
    [req.user.id]
  );
  
  res.json({ success: true, user: result.rows[0] });
});

// Verify token
export const verifyToken = catchAsync(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.json({ valid: false });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await query(
      'SELECT id, name, email, role, status FROM users WHERE id = $1',
      [decoded.id]
    );
    
    if (user.rows.length === 0 || user.rows[0].status !== 'active') {
      return res.json({ valid: false });
    }
    
    res.json({ valid: true, user: user.rows[0] });
  } catch (error) {
    res.json({ valid: false });
  }
});

// Logout
export const logout = catchAsync(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get staff performance data
export const getStaffPerformance = catchAsync(async (req, res) => {
  const { period = 'month' } = req.query;
  
  let days;
  switch(period) {
    case 'week': days = 7; break;
    case 'month': days = 30; break;
    case 'year': days = 365; break;
    default: days = 30;
  }
  
  const salesByStaff = await query(`
    SELECT 
      u.id,
      u.name,
      u.role,
      COUNT(s.id) as total_sales,
      COALESCE(SUM(s.total_amount), 0) as total_revenue,
      COALESCE(SUM(s.profit), 0) as total_profit,
      COALESCE(AVG(s.total_amount), 0) as avg_order_value,
      COUNT(DISTINCT DATE(s.created_at)) as active_days
    FROM users u
    LEFT JOIN sales s ON u.id = s.user_id 
      AND s.created_at >= NOW() - INTERVAL '${days} days'
      AND s.status = 'completed'
    WHERE u.role IN ('cashier', 'waiter', 'manager', 'owner', 'admin')
    GROUP BY u.id, u.name, u.role
    ORDER BY total_revenue DESC
  `);
  
  const ordersByWaiter = await query(`
    SELECT 
      u.id,
      u.name,
      COUNT(o.id) as total_orders,
      COALESCE(SUM(o.total_amount), 0) as total_value,
      COALESCE(AVG(o.total_amount), 0) as avg_order
    FROM users u
    LEFT JOIN orders o ON u.id = o.created_by
      AND o.created_at >= NOW() - INTERVAL '${days} days'
      AND o.status != 'cancelled'
    WHERE u.role = 'waiter'
    GROUP BY u.id, u.name
    ORDER BY total_orders DESC
  `);
  
  res.json({
    success: true,
    data: {
      sales_by_staff: salesByStaff.rows,
      orders_by_waiter: ordersByWaiter.rows,
      period: period
    }
  });
});