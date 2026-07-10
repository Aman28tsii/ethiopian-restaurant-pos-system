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
import { protect, allowOwner } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/signup', signup);
router.post('/verify', verifyToken);

// Protected routes
router.use(protect);
router.get('/me', getCurrentUser);
router.post('/logout', logout);

// Owner only routes - using allowOwner
router.get('/users', allowOwner, getAllUsers);
router.get('/users/pending', allowOwner, getPendingUsers);
router.put('/users/:id/approve', allowOwner, approveUser);
router.delete('/users/:id/reject', allowOwner, rejectUser);
router.get('/performance', allowOwner, getStaffPerformance);

export default router;