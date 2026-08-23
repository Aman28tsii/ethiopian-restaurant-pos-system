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

// ============================================
// CASHIER ROUTES
// ============================================

// Cashier and above can create sales
router.post('/', allowCashier, createSale);

// Cashier and above can view sales (changed from allowManager)
router.get('/', allowCashier, getSales);
router.get('/today', allowCashier, getTodaySales);
router.get('/:id', allowCashier, getSaleById);

export default router;