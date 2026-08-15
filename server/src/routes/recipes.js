import express from 'express';
import { protect, allowManager, allowOwner } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// GET all recipes with product and ingredient details
router.get('/', protect, allowManager, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.id as recipe_id,
                r.product_id,
                r.yield_quantity,
                p.name as product_name,
                p.price as selling_price,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', ri.id,
                            'ingredient_id', ri.ingredient_id,
                            'ingredient_name', i.name,
                            'quantity_required', ri.quantity_required,
                            'unit', i.unit,
                            'unit_cost', i.unit_cost,
                            'wastage_percentage', ri.wastage_percentage,
                            'cooking_loss_percentage', ri.cooking_loss_percentage,
                            'cost_per_product', (ri.quantity_required * i.unit_cost)
                        )
                    ) FILTER (WHERE ri.id IS NOT NULL),
                    '[]'
                ) as ingredients
            FROM recipes r
            JOIN products p ON r.product_id = p.id
            LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
            LEFT JOIN ingredients i ON ri.ingredient_id = i.id
            GROUP BY r.id, p.name, p.price
            ORDER BY p.name
        `);
        
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get recipes error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET recipe by product ID
router.get('/product/:productId', protect, allowManager, async (req, res) => {
    try {
        const { productId } = req.params;
        
        const productResult = await pool.query(
            'SELECT id, name, price FROM products WHERE id = $1',
            [productId]
        );
        
        if (productResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        const recipeResult = await pool.query(`
            SELECT 
                r.id as recipe_id,
                r.yield_quantity,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', ri.id,
                            'ingredient_id', ri.ingredient_id,
                            'ingredient_name', i.name,
                            'quantity_required', ri.quantity_required,
                            'unit', i.unit,
                            'unit_cost', i.unit_cost,
                            'wastage_percentage', ri.wastage_percentage,
                            'cooking_loss_percentage', ri.cooking_loss_percentage,
                            'cost_per_product', (ri.quantity_required * i.unit_cost)
                        )
                    ) FILTER (WHERE ri.id IS NOT NULL),
                    '[]'
                ) as ingredients
            FROM recipes r
            LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
            LEFT JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE r.product_id = $1
            GROUP BY r.id
        `, [productId]);
        
        const product = productResult.rows[0];
        const recipe = recipeResult.rows[0] || { recipe_id: null, yield_quantity: 1, ingredients: [] };
        
        const totalCost = recipe.ingredients.reduce((sum, ing) => 
            sum + parseFloat(ing.cost_per_product || 0), 0
        );
        const sellingPrice = parseFloat(product.price);
        
        res.json({
            success: true,
            data: {
                product_id: parseInt(productId),
                product_name: product.name,
                selling_price: sellingPrice,
                recipe_id: recipe.recipe_id,
                yield_quantity: recipe.yield_quantity,
                total_ingredient_cost: totalCost,
                profit: sellingPrice - totalCost,
                profit_margin: sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice * 100).toFixed(2) : 0,
                ingredients: recipe.ingredients
            }
        });
    } catch (err) {
        console.error('Get recipe by product error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST create or update recipe
router.post('/product/:productId', protect, allowOwner, async (req, res) => {
    const { productId } = req.params;
    const { yield_quantity = 1, ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one ingredient is required' });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Check if product exists
        const productCheck = await client.query(
            'SELECT id FROM products WHERE id = $1',
            [productId]
        );
        
        if (productCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        
        // Check if recipe exists
        const existingRecipe = await client.query(
            'SELECT id FROM recipes WHERE product_id = $1',
            [productId]
        );
        
        let recipeId;
        if (existingRecipe.rows.length > 0) {
            recipeId = existingRecipe.rows[0].id;
            await client.query(
                'UPDATE recipes SET yield_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [yield_quantity, recipeId]
            );
            await client.query(
                'DELETE FROM recipe_ingredients WHERE recipe_id = $1',
                [recipeId]
            );
        } else {
            const result = await client.query(
                `INSERT INTO recipes (product_id, yield_quantity) 
                 VALUES ($1, $2) RETURNING id`,
                [productId, yield_quantity]
            );
            recipeId = result.rows[0].id;
        }
        
        // Insert recipe ingredients
        for (const item of ingredients) {
            if (!item.ingredient_id || !item.quantity_required || item.quantity_required <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false, 
                    error: 'Each ingredient requires valid ingredient_id and quantity_required' 
                });
            }
            
            await client.query(
                `INSERT INTO recipe_ingredients (
                    recipe_id, ingredient_id, quantity_required, 
                    wastage_percentage, cooking_loss_percentage
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    recipeId, 
                    item.ingredient_id, 
                    item.quantity_required,
                    item.wastage_percentage || 0,
                    item.cooking_loss_percentage || 0
                ]
            );
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Recipe saved successfully',
            data: { recipe_id: recipeId }
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Save recipe error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

// DELETE recipe
router.delete('/:id', protect, allowOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recipe not found' });
        }
        res.json({ success: true, message: 'Recipe deleted successfully' });
    } catch (err) {
        console.error('Delete recipe error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE recipe ingredient
router.delete('/ingredient/:id', protect, allowOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM recipe_ingredients WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recipe ingredient not found' });
        }
        res.json({ success: true, message: 'Recipe ingredient removed successfully' });
    } catch (err) {
        console.error('Delete recipe ingredient error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;