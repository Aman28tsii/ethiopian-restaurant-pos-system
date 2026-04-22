import express from 'express';
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getExpenseCategories
} from '../controllers/expenseController.js';
import { protect, allowOwner } from '../middleware/auth.js';

const router = express.Router();

// All expense routes require authentication and owner role
router.use(protect);
router.use(allowOwner);

router.get('/', getAllExpenses);
router.get('/summary', getExpenseSummary);
router.get('/categories', getExpenseCategories);
router.get('/:id', getExpenseById);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;