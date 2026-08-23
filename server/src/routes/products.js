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
import { protect, allowManager, allowOwner } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth needed for viewing)
router.get('/', validatePagination, getAllProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Protected routes (require authentication and manager role)
router.use(protect);
router.use(allowManager);

router.post('/', allowOwner, validateProduct, createProduct);
router.put('/:id', allowOwner, validateProduct, updateProduct);
router.delete('/:id', allowOwner, deleteProduct);

export default router;