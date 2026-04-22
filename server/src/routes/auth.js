import express from 'express';
import {
  login,
  signup,
  getCurrentUser,
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  verifyToken,
  getStaffPerformance,
  logout
} from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/signup', signup);
router.post('/verify', verifyToken);

// Protected routes (need login)
router.use(protect);
router.get('/me', getCurrentUser);
router.post('/logout', logout);

// Admin/Owner only routes (allow both 'admin' and 'owner')
router.get('/users', restrictTo('admin', 'owner'), getAllUsers);
router.get('/users/pending', restrictTo('admin', 'owner'), getPendingUsers);
router.put('/users/:id/approve', restrictTo('admin', 'owner'), approveUser);
router.delete('/users/:id/reject', restrictTo('admin', 'owner'), rejectUser);
router.get('/performance', protect, restrictTo('admin', 'owner', 'manager'), getStaffPerformance);
export default router;