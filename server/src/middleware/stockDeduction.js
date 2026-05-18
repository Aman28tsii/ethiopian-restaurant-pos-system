// Stock deduction logic with wastage calculation

const calculateStockDeduction = (recipeIngredients, orderQuantity) => {
    const deductions = [];
    
    for (const ingredient of recipeIngredients) {
        // Get wastage factors (with defaults)
        const wastagePercent = ingredient.wastage_percentage || 0;
        const cookingLossPercent = ingredient.cooking_loss_percentage || 0;
        
        // Base calculation
        let baseQuantity = ingredient.quantity_required * orderQuantity;
        
        // Apply wastage (trimming, spoilage, spillage)
        let afterWastage = baseQuantity * (1 + (wastagePercent / 100));
        
        // Apply cooking loss (evaporation, shrinkage)
        let finalQuantity = afterWastage * (1 + (cookingLossPercent / 100));
        
        // Round up to nearest unit (can't deduct half an egg)
        if (ingredient.unit === 'pcs') {
            finalQuantity = Math.ceil(finalQuantity);
        } else {
            finalQuantity = Math.ceil(finalQuantity * 100) / 100;
        }
        
        deductions.push({
            ingredient_id: ingredient.ingredient_id,
            ingredient_name: ingredient.name,
            expected: baseQuantity,
            actual: finalQuantity,
            wastage: finalQuantity - baseQuantity,
            wastage_percentage: ((finalQuantity - baseQuantity) / baseQuantity * 100).toFixed(1),
            unit: ingredient.unit
        });
    }
    
    return deductions;
};

// Middleware to process stock deduction when order is placed
const processOrderStockDeduction = async (orderId, items, db) => {
    const allDeductions = [];
    
    for (const item of items) {
        // Fetch recipe for this product
        const recipeQuery = `
            SELECT 
                ri.ingredient_id,
                ri.quantity_required,
                i.name,
                i.unit,
                i.wastage_percentage,
                i.cooking_loss_percentage,
                i.current_stock,
                i.unit_cost
            FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.product_id = $1
        `;
        
        const recipe = await db.query(recipeQuery, [item.product_id]);
        
        if (recipe.rows.length === 0) {
            console.warn(`No recipe found for product ${item.product_id}`);
            continue;
        }
        
        // Calculate deductions with wastage
        const deductions = calculateStockDeduction(recipe.rows, item.quantity);
        
        // Apply each deduction
        for (const deduction of deductions) {
            // Check if enough stock
            const ingredient = recipe.rows.find(r => r.ingredient_id === deduction.ingredient_id);
            
            if (ingredient.current_stock < deduction.actual) {
                throw new Error(`Insufficient stock for ${deduction.ingredient_name}. Available: ${ingredient.current_stock} ${deduction.unit}, Required: ${deduction.actual}`);
            }
            
            // Update stock
            await db.query(`
                UPDATE ingredients 
                SET current_stock = current_stock - $1,
                    last_used = NOW()
                WHERE id = $2
            `, [deduction.actual, deduction.ingredient_id]);
            
            // Record transaction
            await db.query(`
                INSERT INTO stock_transactions (
                    ingredient_id,
                    order_id,
                    expected_quantity,
                    actual_quantity,
                    wastage_amount,
                    wastage_percentage,
                    transaction_type
                ) VALUES ($1, $2, $3, $4, $5, $6, 'order_deduction')
            `, [
                deduction.ingredient_id,
                orderId,
                deduction.expected,
                deduction.actual,
                deduction.wastage,
                deduction.wastage_percentage
            ]);
            
            allDeductions.push(deduction);
        }
    }
    
    return allDeductions;
};

module.exports = { calculateStockDeduction, processOrderStockDeduction };