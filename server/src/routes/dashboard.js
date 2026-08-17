import express from 'express';
import {
  getDashboardData,
  getChartData
} from '../controllers/dashboardController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

// Owner and manager can view dashboard
router.get('/', restrictTo('owner', 'admin', 'manager'), getDashboardData);
router.get('/charts', restrictTo('owner', 'admin', 'manager'), getChartData);

export default router;
