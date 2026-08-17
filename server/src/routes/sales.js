import express from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  getTodaySales
} from '../controllers/saleController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Cashier and above can create sales
router.post('/', restrictTo('cashier', 'manager', 'owner', 'admin'), createSale);

// Manager and above can view sales history
router.get('/', restrictTo('manager', 'owner', 'admin'), getSales);
router.get('/today', restrictTo('manager', 'owner', 'admin'), getTodaySales);
router.get('/:id', restrictTo('manager', 'owner', 'admin'), getSaleById);

export default router;
