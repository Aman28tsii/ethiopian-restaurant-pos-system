import express from 'express';
import {
  getAllTables,
  getAvailableTables,
  getTableById,
  updateTableStatus,
  reserveTable
} from '../controllers/tableController.js';
import { protect, allowWaiter, allowManager } from '../middleware/auth.js';

const router = express.Router();

// All table routes require authentication
router.use(protect);

// Waiter and above can view tables
router.get('/', allowWaiter, getAllTables);
router.get('/available', allowWaiter, getAvailableTables);
router.get('/:id', allowWaiter, getTableById);

// Manager and above can update tables
router.put('/:id/status', allowManager, updateTableStatus);
router.post('/:id/reserve', allowWaiter, reserveTable);

export default router;