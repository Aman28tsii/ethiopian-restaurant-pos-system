// backend/src/routes/auth.js
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

// Protected routes
router.use(protect);
router.get('/me', getCurrentUser);
router.post('/logout', logout);

// Owner/Admin only routes
router.get('/users', restrictTo('owner', 'admin'), getAllUsers);
router.get('/users/pending', restrictTo('owner', 'admin'), getPendingUsers);
router.put('/users/:id/approve', restrictTo('owner', 'admin'), approveUser);
router.delete('/users/:id/reject', restrictTo('owner', 'admin'), rejectUser);
router.get('/performance', restrictTo('owner', 'admin'), getStaffPerformance);

export default router;
