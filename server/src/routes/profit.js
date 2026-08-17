import express from 'express';
import {
  getProfitReport,
  getTodayProfit,
  getMonthlyTrend
} from '../controllers/profitController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All profit routes require authentication and manager role or above
router.use(protect);
router.use(restrictTo('manager', 'owner', 'admin'));

router.get('/report', getProfitReport);
router.get('/today', getTodayProfit);
router.get('/trend', getMonthlyTrend);

export default router;
