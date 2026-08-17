// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Role hierarchy
const roleHierarchy = {
  'staff': 0,
  'kitchen': 1,
  'waiter': 2,
  'cashier': 3,
  'manager': 4,
  'owner': 5,
  'admin': 5
};

// Verify token and attach user to request
export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log('✅ Authenticated:', req.user.email, 'Role:', req.user.role);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

// RESTRICT TO - Single source of truth for authorization
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    console.log(🔍 User role: , Required: );
    
    // Check if user role is in allowed roles
    if (roles.includes(userRole)) {
      return next();
    }
    
    // Allow owner if admin is required, and vice versa
    if (roles.includes('owner') && userRole === 'admin') {
      return next();
    }
    if (roles.includes('admin') && userRole === 'owner') {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. You do not have permission for this action.' 
    });
  };
};

// Helper functions
export const isOwner = (req) => {
  const role = req.user?.role;
  return role === 'owner' || role === 'admin';
};

export const isManagerOrAbove = (req) => {
  const role = req.user?.role;
  return role === 'owner' || role === 'admin' || role === 'manager';
};

export const getUserRole = (req) => {
  return req.user?.role || null;
};
