import express from 'express';
import {
    getAllRecipes,
    getRecipeByProduct,
    createOrUpdateRecipe,
    deleteRecipe,
    deleteRecipeIngredient,
    getWastageReport,
    getOrderWastage,
    updateIngredientWastage,
    calculateOrderWastage,
    getAllIngredientsWithWastage,
    getLowStockIngredients
} from '../controllers/recipeController.js';
import { protect, allowManager, allowOwner } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// RECIPE MANAGEMENT
// ============================================
router.get('/', allowManager, getAllRecipes);
router.get('/product/:productId', allowManager, getRecipeByProduct);
router.post('/product/:productId', allowManager, createOrUpdateRecipe);
router.delete('/:id', allowOwner, deleteRecipe);
router.delete('/ingredient/:id', allowOwner, deleteRecipeIngredient);

// ============================================
// WASTAGE REPORTS
// ============================================
router.get('/wastage-report', allowManager, getWastageReport);
router.get('/order/:orderId/wastage', allowManager, getOrderWastage);
router.post('/order/:orderId/calculate-wastage', allowManager, calculateOrderWastage);

// ============================================
// INGREDIENT WASTAGE SETTINGS
// ============================================
router.put('/ingredient/:id/wastage', allowOwner, updateIngredientWastage);
router.get('/ingredients', allowManager, getAllIngredientsWithWastage);
router.get('/ingredients/low-stock', allowManager, getLowStockIngredients);

export default router;