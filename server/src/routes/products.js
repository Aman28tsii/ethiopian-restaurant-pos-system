import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} from '../controllers/productController.js';
import { validateProduct, validatePagination } from '../middleware/validation.js';
import { protect, allowManager } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth needed for viewing)
router.get('/', validatePagination, getAllProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Protected routes (require authentication and manager role)
router.use(protect);
router.use(allowManager);

router.post('/', validateProduct, createProduct);
router.put('/:id', validateProduct, updateProduct);
router.delete('/:id', deleteProduct);

export default router;