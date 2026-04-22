import express from 'express';
import {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getLowStock,
  getIngredientCategories
} from '../controllers/ingredientController.js';
import { protect, allowManager } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Manager and above can view ingredients
router.get('/', allowManager, getAllIngredients);
router.get('/low-stock', allowManager, getLowStock);
router.get('/categories', allowManager, getIngredientCategories);
router.get('/:id', allowManager, getIngredientById);

// Manager and above can modify ingredients
router.post('/', allowManager, createIngredient);
router.put('/:id', allowManager, updateIngredient);
router.delete('/:id', allowManager, deleteIngredient);

export default router;