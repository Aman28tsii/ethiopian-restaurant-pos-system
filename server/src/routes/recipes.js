import express from 'express';
import {
  getAllRecipes,
  getRecipeByProduct,
  createOrUpdateRecipe,
  deleteRecipeItem,
  getProductsWithoutRecipes,
  calculateProductCost
} from '../controllers/recipeController.js';

const router = express.Router();

router.get('/', getAllRecipes);
router.get('/products-without', getProductsWithoutRecipes);
router.get('/product/:productId', getRecipeByProduct);
router.get('/cost/:productId', calculateProductCost);
router.post('/product/:productId', createOrUpdateRecipe);
router.delete('/:id', deleteRecipeItem);

export default router;