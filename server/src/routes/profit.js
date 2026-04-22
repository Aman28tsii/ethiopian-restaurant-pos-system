import express from 'express';
import {
  getProfitReport,
  getTodayProfit,
  getMonthlyTrend
} from '../controllers/profitController.js';
import { protect, allowManager } from '../middleware/auth.js';

const router = express.Router();

// All profit routes require authentication and manager role
router.use(protect);
router.use(allowManager);

router.get('/report', getProfitReport);
router.get('/today', getTodayProfit);
router.get('/trend', getMonthlyTrend);

export default router;