import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderDetails,
  addOrderItems,
  cancelOrder
} from '../controllers/waiterController.js';
import { protect, allowWaiter } from '../middleware/auth.js';

const router = express.Router();

// All waiter routes require authentication and waiter role
router.use(protect);
router.use(allowWaiter);

// Order management
router.post('/orders', createOrder);
router.get('/orders', getMyOrders);
router.get('/orders/:orderId', getOrderDetails);
router.post('/orders/:orderId/items', addOrderItems);
router.put('/orders/:orderId/cancel', cancelOrder);

export default router;