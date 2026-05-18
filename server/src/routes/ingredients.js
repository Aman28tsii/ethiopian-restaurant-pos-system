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
// Add these new endpoints to your existing inventory routes

// PUT /api/ingredients/:id/wastage - Update wastage settings
router.put('/ingredients/:id/wastage', auth, async (req, res) => {
    const { id } = req.params;
    const { wastage_percentage, cooking_loss_percentage, yield_percentage } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE ingredients 
            SET wastage_percentage = COALESCE($1, wastage_percentage),
                cooking_loss_percentage = COALESCE($2, cooking_loss_percentage),
                yield_percentage = COALESCE($3, yield_percentage),
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `, [wastage_percentage, cooking_loss_percentage, yield_percentage, id]);
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update wastage error:', error);
        res.status(500).json({ error: 'Failed to update wastage settings' });
    }
});

// GET /api/ingredients/wastage-report - Get wastage report
router.get('/ingredients/wastage-report', auth, async (req, res) => {
    const { start_date, end_date } = req.query;
    
    try {
        const result = await db.query(`
            SELECT * FROM wastage_summary
            WHERE total_wastage > 0
            ORDER BY wastage_cost DESC
        `);
        
        // Get detailed daily wastage
        const dailyWastage = await db.query(`
            SELECT 
                DATE(st.created_at) as date,
                COUNT(DISTINCT st.order_id) as orders_affected,
                SUM(st.wastage_amount) as total_wastage,
                SUM(st.wastage_amount * i.unit_cost) as total_cost
            FROM stock_transactions st
            JOIN ingredients i ON st.ingredient_id = i.id
            WHERE st.created_at >= COALESCE($1, '2024-01-01')
            AND st.created_at <= COALESCE($2, NOW())
            GROUP BY DATE(st.created_at)
            ORDER BY date DESC
        `, [start_date, end_date]);
        
        res.json({ 
            success: true, 
            data: {
                summary: result.rows,
                daily: dailyWastage.rows
            }
        });
    } catch (error) {
        console.error('Wastage report error:', error);
        res.status(500).json({ error: 'Failed to generate wastage report' });
    }
});

// POST /api/orders/:id/calculate-wastage - Calculate wastage for an order
router.post('/orders/:id/calculate-wastage', auth, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Get order items with recipes
        const orderItems = await db.query(`
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
        `, [id]);
        
        let totalWastage = 0;
        const wastageDetails = [];
        
        for (const item of orderItems.rows) {
            // Get recipe ingredients with wastage factors
            const recipe = await db.query(`
                SELECT 
                    ri.ingredient_id,
                    ri.quantity_required,
                    i.name,
                    i.unit,
                    i.wastage_percentage,
                    i.cooking_loss_percentage,
                    i.unit_cost
                FROM recipe_ingredients ri
                JOIN ingredients i ON ri.ingredient_id = i.id
                WHERE ri.product_id = $1
            `, [item.product_id]);
            
            for (const ing of recipe.rows) {
                // Calculate with wastage
                let expected = ing.quantity_required * item.quantity;
                let wastageMultiplier = 1 + (ing.wastage_percentage / 100);
                let cookingMultiplier = 1 + (ing.cooking_loss_percentage / 100);
                let actual = expected * wastageMultiplier * cookingMultiplier;
                let wastage = actual - expected;
                let wastageCost = wastage * ing.unit_cost;
                
                totalWastage += wastageCost;
                
                wastageDetails.push({
                    ingredient: ing.name,
                    expected: expected,
                    actual: actual,
                    wastage: wastage,
                    cost: wastageCost,
                    unit: ing.unit
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                total_wastage_cost: totalWastage,
                details: wastageDetails
            }
        });
    } catch (error) {
        console.error('Calculate wastage error:', error);
        res.status(500).json({ error: 'Failed to calculate wastage' });
    }
});
export default router;