import express from 'express';
import { protect, allowManager, allowOwner } from '../middleware/auth.js';
import {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getLowStock
} from '../controllers/ingredientController.js';

const router = express.Router();

// Manager and above can view inventory
router.get('/', protect, allowManager, getAllIngredients);
router.get('/low-stock', protect, allowManager, getLowStock);
router.get('/:id', protect, allowManager, getIngredientById);

// Owner only for write operations
router.post('/', protect, allowOwner, createIngredient);
router.put('/:id', protect, allowOwner, updateIngredient);
router.delete('/:id', protect, allowOwner, deleteIngredient);

export default router;