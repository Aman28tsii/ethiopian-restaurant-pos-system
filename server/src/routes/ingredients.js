import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// GET all ingredients
router.get('/', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, unit, quantity, min_stock, unit_cost, category, supplier FROM ingredients ORDER BY name'
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get ingredients error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET ingredient by ID
router.get('/:id', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM ingredients WHERE id = ', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ingredient not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Get ingredient error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET ingredient categories
router.get('/categories', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT DISTINCT category FROM ingredients WHERE category IS NOT NULL ORDER BY category'
        );
        const categories = result.rows.map(function(r) { return r.category; });
        res.json({ success: true, data: categories });
    } catch (err) {
        console.error('Get ingredient categories error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET low stock alert - FIXED
router.get('/low-stock-alert', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, quantity, min_stock, unit FROM ingredients WHERE quantity <= min_stock ORDER BY quantity ASC'
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Low stock alert error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET low stock
router.get('/low-stock', protect, restrictTo('manager', 'owner', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, quantity, min_stock, unit, unit_cost FROM ingredients WHERE quantity <= min_stock'
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Low stock error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST create ingredient
router.post('/', protect, restrictTo('owner', 'admin'), async (req, res) => {
    try {
        const { name, unit, quantity, min_stock, unit_cost, category, supplier } = req.body;
        
        if (!name || !unit) {
            return res.status(400).json({ success: false, error: 'Name and unit are required' });
        }
        
        const result = await pool.query(
            'INSERT INTO ingredients (name, unit, quantity, min_stock, unit_cost, category, supplier) VALUES (, , , , , , ) RETURNING *',
            [name.trim(), unit, quantity || 0, min_stock || 0, unit_cost || 0, category || null, supplier || null]
        );
        
        res.status(201).json({ success: true, message: 'Ingredient created successfully', data: result.rows[0] });
    } catch (err) {
        console.error('Create ingredient error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT update ingredient
router.put('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, unit, quantity, min_stock, unit_cost, category, supplier } = req.body;
        
        const result = await pool.query(
            'UPDATE ingredients SET name = , unit = , quantity = , min_stock = , unit_cost = , category = , supplier = , updated_at = NOW() WHERE id =  RETURNING *',
            [name, unit, quantity, min_stock, unit_cost, category, supplier, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ingredient not found' });
        }
        
        res.json({ success: true, message: 'Ingredient updated successfully', data: result.rows[0] });
    } catch (err) {
        console.error('Update ingredient error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE ingredient
router.delete('/:id', protect, restrictTo('owner', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const recipeCheck = await pool.query(
            'SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_id = ',
            [id]
        );
        
        if (parseInt(recipeCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete ingredient that is used in recipes'
            });
        }
        
        await pool.query('DELETE FROM ingredients WHERE id = ', [id]);
        res.json({ success: true, message: 'Ingredient deleted successfully' });
    } catch (err) {
        console.error('Delete ingredient error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT adjust stock
router.put('/:id/adjust-stock', protect, restrictTo('owner', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;
        
        const currentIngredient = await pool.query(
            'SELECT name, quantity, unit FROM ingredients WHERE id = ',
            [id]
        );
        
        if (currentIngredient.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ingredient not found' });
        }
        
        const currentQuantity = parseFloat(currentIngredient.rows[0].quantity);
        const newQuantity = currentQuantity + parseFloat(amount);
        
        if (newQuantity < 0) {
            return res.status(400).json({ success: false, error: 'Cannot reduce stock below zero' });
        }
        
        const result = await pool.query(
            'UPDATE ingredients SET quantity = , updated_at = NOW() WHERE id =  RETURNING *',
            [newQuantity, id]
        );
        
        const action = amount > 0 ? 'added to' : 'removed from';
        const absAmount = Math.abs(amount);
        
        res.json({
            success: true,
            message: absAmount + ' ' + result.rows[0].unit + ' ' + action + ' ' + result.rows[0].name,
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Adjust stock error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
