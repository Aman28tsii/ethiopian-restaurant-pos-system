import express from 'express';
import {
    getAllRecipes,
    getRecipeByProduct,
    createOrUpdateRecipe,
    deleteRecipe,
    deleteRecipeIngredient,
    getWastageReport,
    getOrderWastage,
    calculateOrderWastage,
    updateIngredientWastage,
    getAllIngredientsWithWastage,
    getLowStockIngredients,
    getProductsWithoutRecipes,
    getRecipeCount,
    getProductCost  // ✅ ADD THIS
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

// ✅ ADD THIS ROUTE - Product Cost
router.get('/cost/:productId', allowManager, getProductCost);

// ============================================
// PRODUCTS WITHOUT RECIPES
// ============================================
router.get('/products-without', allowManager, getProductsWithoutRecipes);
router.get('/count', allowManager, getRecipeCount);

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