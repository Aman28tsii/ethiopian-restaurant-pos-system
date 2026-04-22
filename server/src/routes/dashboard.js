import express from 'express';
import {
  getDashboardData,
  getChartData  // Add this import
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', getDashboardData);
router.get('/charts', getChartData);  // Add this line

export default router;