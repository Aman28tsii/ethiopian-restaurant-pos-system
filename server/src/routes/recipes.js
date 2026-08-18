import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
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
    getRecipeCount
} from '../controllers/recipeController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// RECIPE MANAGEMENT
// ============================================
router.get('/', restrictTo('manager', 'owner', 'admin'), getAllRecipes);
router.get('/product/:productId', restrictTo('manager', 'owner', 'admin'), getRecipeByProduct);
router.post('/product/:productId', restrictTo('manager', 'owner', 'admin'), createOrUpdateRecipe);
router.delete('/:id', restrictTo('owner', 'admin'), deleteRecipe);
router.delete('/ingredient/:id', restrictTo('owner', 'admin'), deleteRecipeIngredient);

// ============================================
// PRODUCTS WITHOUT RECIPES
// ============================================
router.get('/products-without', restrictTo('manager', 'owner', 'admin'), getProductsWithoutRecipes);
router.get('/count', restrictTo('manager', 'owner', 'admin'), getRecipeCount);

// ============================================
// WASTAGE REPORTS
// ============================================
router.get('/wastage-report', restrictTo('manager', 'owner', 'admin'), getWastageReport);
router.get('/order/:orderId/wastage', restrictTo('manager', 'owner', 'admin'), getOrderWastage);
router.post('/order/:orderId/calculate-wastage', restrictTo('manager', 'owner', 'admin'), calculateOrderWastage);

// ============================================
// INGREDIENT WASTAGE SETTINGS
// ============================================
router.put('/ingredient/:id/wastage', restrictTo('owner', 'admin'), updateIngredientWastage);
router.get('/ingredients', restrictTo('manager', 'owner', 'admin'), getAllIngredientsWithWastage);
router.get('/ingredients/low-stock', restrictTo('manager', 'owner', 'admin'), getLowStockIngredients);

export default router;