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

// Check if user has required role or higher
export const hasRole = (requiredRole) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'staff';
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    if (userLevel >= requiredLevel) {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      error: `Access denied. ${requiredRole} role or higher required.` 
    });
  };
};

// RESTRICT TO - Fix for owner/admin
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    console.log(`🔍 User role: ${userRole}, Required: ${roles.join(', ')}`);
    
    // Check if user role is in allowed roles
    if (roles.includes(userRole)) {
      return next();
    }
    
    // If 'owner' is required, also allow 'admin'
    if (roles.includes('owner') && userRole === 'admin') {
      return next();
    }
    
    // If 'admin' is required, also allow 'owner'
    if (roles.includes('admin') && userRole === 'owner') {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. You do not have permission for this action.' 
    });
  };
};

// Owner middleware - allows both owner and admin
export const allowOwner = (req, res, next) => {
  const role = req.user?.role;
  console.log(`🔍 allowOwner check: ${role}`);
  
  if (role === 'owner' || role === 'admin') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Only owners and admins can perform this action.' 
  });
};

export const allowManager = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'owner' || role === 'admin' || role === 'manager') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Manager role or higher required.' 
  });
};

export const allowCashier = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'owner' || role === 'admin' || role === 'manager' || role === 'cashier') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Cashier role or higher required.' 
  });
};

export const allowWaiter = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'owner' || role === 'admin' || role === 'manager' || role === 'cashier' || role === 'waiter') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Waiter role or higher required.' 
  });
};

export const allowKitchen = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'owner' || role === 'admin' || role === 'manager' || role === 'kitchen') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Kitchen role or higher required.' 
  });
};

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