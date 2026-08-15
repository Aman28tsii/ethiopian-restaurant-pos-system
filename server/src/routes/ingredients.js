import express from 'express';
import { protect, allowManager, allowOwner } from '../middleware/auth.js';
import {
    getAllIngredients,
    getIngredientById,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    getLowStock,
    getLowStockAlert,
    adjustStock,
    getIngredientCategories
} from '../controllers/ingredientController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// INGREDIENT CRUD
// ============================================
router.get('/', allowManager, getAllIngredients);
router.get('/low-stock', allowManager, getLowStock);
router.get('/low-stock-alert', allowManager, getLowStockAlert);
router.get('/categories', allowManager, getIngredientCategories);
router.get('/:id', allowManager, getIngredientById);

// Owner only for write operations
router.post('/', allowOwner, createIngredient);
router.put('/:id', allowOwner, updateIngredient);
router.delete('/:id', allowOwner, deleteIngredient);
router.put('/:id/adjust-stock', allowOwner, adjustStock);

export default router;