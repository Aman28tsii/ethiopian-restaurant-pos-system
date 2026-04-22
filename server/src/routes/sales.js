import express from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  getTodaySales
} from '../controllers/saleController.js';
import { protect, allowCashier, allowManager } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Cashier and above can create sales
router.post('/', allowCashier, createSale);

// Manager and above can view sales history
router.get('/', allowManager, getSales);
router.get('/today', allowManager, getTodaySales);
router.get('/:id', allowManager, getSaleById);

export default router;