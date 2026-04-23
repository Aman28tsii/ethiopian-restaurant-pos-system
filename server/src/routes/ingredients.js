import express from 'express';
import {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  adjustStock,
  getLowStock,
  getLowStockAlert,
  getIngredientCategories
} from '../controllers/ingredientController.js';
import { protect, allowManager } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', allowManager, getAllIngredients);
router.get('/low-stock', allowManager, getLowStock);
router.get('/low-stock-alert', allowManager, getLowStockAlert);
router.get('/categories', allowManager, getIngredientCategories);
router.get('/:id', allowManager, getIngredientById);

router.post('/', allowManager, createIngredient);
router.put('/:id', allowManager, updateIngredient);
router.delete('/:id', allowManager, deleteIngredient);
router.patch('/:id/stock', allowManager, adjustStock);

export default router;