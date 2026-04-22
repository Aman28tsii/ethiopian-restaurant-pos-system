import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Role hierarchy (higher number = more access)
const roleHierarchy = {
  'kitchen': 1,
  'waiter': 2,
  'cashier': 3,
  'manager': 4,
  'owner': 5,
  'admin': 5  // admin same as owner
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
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

// Check if user has required role or higher
export const hasRole = (requiredRole) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
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

// Role-specific middleware (easy to use)
export const allowOwner = hasRole('owner');
export const allowManager = hasRole('manager');
export const allowCashier = hasRole('cashier');
export const allowWaiter = hasRole('waiter');
export const allowKitchen = hasRole('kitchen');

// Check exact role (not hierarchy)
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. You do not have permission for this action.' 
    });
  };
};

// Get user role info
export const getUserRole = (req) => {
  return req.user?.role || null;
};

// Check if user is owner or admin
export const isOwner = (req) => {
  const role = req.user?.role;
  return role === 'owner' || role === 'admin';
};

// Check if user is manager or above
export const isManagerOrAbove = (req) => {
  const role = req.user?.role;
  return role === 'owner' || role === 'admin' || role === 'manager';
};