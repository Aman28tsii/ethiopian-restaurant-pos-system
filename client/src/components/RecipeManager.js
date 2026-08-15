import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { 
    UtensilsCrossed, Plus, Trash2, X, Loader2, Save,
    DollarSign, AlertCircle, CheckCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const RecipeManager = ({ productId, productName, productPrice, onSave, onClose }) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ingredients, setIngredients] = useState([]);
    const [allIngredients, setAllIngredients] = useState([]);
    const [selectedIngredient, setSelectedIngredient] = useState({
        ingredient_id: '',
        quantity_required: '',
        wastage_percentage: 0,
        cooking_loss_percentage: 0
    });
    const [yieldQuantity, setYieldQuantity] = useState(1);
    const [costSummary, setCostSummary] = useState({
        totalCost: 0,
        profit: 0,
        profitMargin: 0
    });

    useEffect(() => {
        fetchData();
    }, [productId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // ✅ Fetch recipe for the PRODUCT
            const recipeRes = await API.get(`/recipes/product/${productId}`);
            
            // ✅ Fetch ALL ingredients (these are raw materials)
            const ingredientsRes = await API.get('/ingredients');
            
            const recipeData = recipeRes.data.data;
            setIngredients(recipeData.ingredients || []);
            setYieldQuantity(recipeData.yield_quantity || 1);
            
            // ✅ These are raw ingredients that can be added to the recipe
            setAllIngredients(ingredientsRes.data.data || []);
            
            calculateCost(recipeData.ingredients || []);
        } catch (err) {
            console.error('Fetch recipe error:', err);
            // If no recipe exists, just load ingredients
            try {
                const ingredientsRes = await API.get('/ingredients');
                setAllIngredients(ingredientsRes.data.data || []);
            } catch (e) {
                console.error('Error loading ingredients:', e);
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateCost = (ingList) => {
        let totalCost = 0;
        ingList.forEach(ing => {
            const qty = parseFloat(ing.quantity_required) || 0;
            const cost = parseFloat(ing.unit_cost) || 0;
            const wastage = parseFloat(ing.wastage_percentage) || 0;
            const cookingLoss = parseFloat(ing.cooking_loss_percentage) || 0;
            
            // Calculate effective quantity with wastage
            const effectiveQty = qty * (1 + wastage / 100) * (1 + cookingLoss / 100);
            totalCost += effectiveQty * cost;
        });

        const sellingPrice = parseFloat(productPrice) || 0;
        const profit = sellingPrice - totalCost;
        const profitMargin = sellingPrice > 0 ? (profit / sellingPrice * 100) : 0;

        setCostSummary({
            totalCost,
            profit,
            profitMargin
        });
    };

    const addIngredient = () => {
        if (!selectedIngredient.ingredient_id || !selectedIngredient.quantity_required) {
            alert(t('pleaseSelectIngredientAndQuantity'));
            return;
        }

        const ingredient = allIngredients.find(i => i.id === parseInt(selectedIngredient.ingredient_id));
        if (!ingredient) return;

        const qty = parseFloat(selectedIngredient.quantity_required);
        const unitCost = parseFloat(ingredient.unit_cost);
        const wastage = parseFloat(selectedIngredient.wastage_percentage) || 0;
        const cookingLoss = parseFloat(selectedIngredient.cooking_loss_percentage) || 0;
        
        // Calculate effective cost with wastage
        const effectiveQty = qty * (1 + wastage / 100) * (1 + cookingLoss / 100);
        const costPerProduct = effectiveQty * unitCost;

        const newIngredient = {
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            quantity_required: qty,
            unit: ingredient.unit,
            unit_cost: unitCost,
            wastage_percentage: wastage,
            cooking_loss_percentage: cookingLoss,
            cost_per_product: costPerProduct
        };

        const updatedIngredients = [...ingredients, newIngredient];
        setIngredients(updatedIngredients);
        calculateCost(updatedIngredients);

        setSelectedIngredient({
            ingredient_id: '',
            quantity_required: '',
            wastage_percentage: 0,
            cooking_loss_percentage: 0
        });
    };

    const removeIngredient = (index) => {
        const updatedIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(updatedIngredients);
        calculateCost(updatedIngredients);
    };

    const updateIngredientQuantity = (index, field, value) => {
        const updated = ingredients.map((ing, i) => {
            if (i === index) {
                const qty = parseFloat(value) || 0;
                const unitCost = parseFloat(ing.unit_cost);
                const wastage = parseFloat(ing.wastage_percentage) || 0;
                const cookingLoss = parseFloat(ing.cooking_loss_percentage) || 0;
                
                const effectiveQty = qty * (1 + wastage / 100) * (1 + cookingLoss / 100);
                const cost = effectiveQty * unitCost;
                
                return { 
                    ...ing, 
                    [field]: qty, 
                    quantity_required: qty,
                    cost_per_product: cost 
                };
            }
            return ing;
        });
        setIngredients(updated);
        calculateCost(updated);
    };

    const updateWastage = (index, field, value) => {
        const updated = ingredients.map((ing, i) => {
            if (i === index) {
                const val = parseFloat(value) || 0;
                const qty = parseFloat(ing.quantity_required);
                const unitCost = parseFloat(ing.unit_cost);
                const wastage = field === 'wastage_percentage' ? val : parseFloat(ing.wastage_percentage) || 0;
                const cookingLoss = field === 'cooking_loss_percentage' ? val : parseFloat(ing.cooking_loss_percentage) || 0;
                
                const effectiveQty = qty * (1 + wastage / 100) * (1 + cookingLoss / 100);
                const cost = effectiveQty * unitCost;
                
                return { ...ing, [field]: val, cost_per_product: cost };
            }
            return ing;
        });
        setIngredients(updated);
        calculateCost(updated);
    };

    const saveRecipe = async () => {
        if (ingredients.length === 0) {
            alert(t('pleaseAddAtLeastOneIngredient'));
            return;
        }

        setSaving(true);
        try {
            const payload = {
                yield_quantity: yieldQuantity,
                ingredients: ingredients.map(ing => ({
                    ingredient_id: ing.ingredient_id,
                    quantity_required: ing.quantity_required,
                    wastage_percentage: ing.wastage_percentage || 0,
                    cooking_loss_percentage: ing.cooking_loss_percentage || 0
                }))
            };

            await API.post(`/recipes/product/${productId}`, payload);
            alert(t('recipeSavedSuccessfully'));
            if (onSave) onSave();
        } catch (err) {
            console.error('Save recipe error:', err);
            alert(err.response?.data?.error || t('failedToSaveRecipe'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8">
                    <Loader2 className="animate-spin text-blue-500 mx-auto" size={40} />
                    <p className="text-gray-500 mt-4">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <UtensilsCrossed size={24} className="text-purple-600 dark:text-purple-400" />
                                Recipe: {productName}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                Selling Price: Br {parseFloat(productPrice).toFixed(2)}
                            </p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Profit Summary */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <DollarSign size={18} className="text-purple-600 dark:text-purple-400" />
                            Profit Summary
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Ingredient Cost</p>
                                <p className="text-red-600 dark:text-red-400 font-bold text-lg">
                                    Br {costSummary.totalCost.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Profit</p>
                                <p className={`font-bold text-lg ${
                                    costSummary.profit >= 0 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : 'text-red-600 dark:text-red-400'
                                }`}>
                                    Br {costSummary.profit.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Profit Margin</p>
                                <p className={`font-bold text-lg ${
                                    costSummary.profitMargin >= 30 
                                        ? 'text-green-600 dark:text-green-400' 
                                        : costSummary.profitMargin >= 15 
                                            ? 'text-yellow-600 dark:text-yellow-400' 
                                            : 'text-red-600 dark:text-red-400'
                                }`}>
                                    {costSummary.profitMargin.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Yield Quantity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Yield Quantity
                            <span className="text-gray-500 text-xs ml-2">(How many portions this makes)</span>
                        </label>
                        <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={yieldQuantity}
                            onChange={(e) => setYieldQuantity(parseFloat(e.target.value) || 1)}
                            className="w-32 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Ingredients List */}
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Ingredients Needed</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {ingredients.map((ing, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="text-gray-900 dark:text-white font-medium">{ing.ingredient_name}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={ing.quantity_required}
                                                    onChange={(e) => updateIngredientQuantity(idx, 'quantity_required', e.target.value)}
                                                    className="w-20 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm"
                                                />
                                                <span className="text-gray-500 dark:text-gray-400">{ing.unit}</span>
                                                <span className="text-gray-500 dark:text-gray-400">×</span>
                                                <span className="text-gray-500 dark:text-gray-400">Br {parseFloat(ing.unit_cost).toFixed(2)}</span>
                                                <span className="text-gray-500 dark:text-gray-400">=</span>
                                                <span className="text-purple-600 dark:text-purple-400 font-medium">
                                                    Br {parseFloat(ing.cost_per_product).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Wastage:</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    max="50"
                                                    value={ing.wastage_percentage || 0}
                                                    onChange={(e) => updateWastage(idx, 'wastage_percentage', e.target.value)}
                                                    className="w-16 px-1 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs"
                                                />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                                                <label className="text-xs text-gray-500 dark:text-gray-400 ml-2">Cooking Loss:</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    max="50"
                                                    value={ing.cooking_loss_percentage || 0}
                                                    onChange={(e) => updateWastage(idx, 'cooking_loss_percentage', e.target.value)}
                                                    className="w-16 px-1 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs"
                                                />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeIngredient(idx)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            {ingredients.length === 0 && (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-50" />
                                    No ingredients added yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Ingredient Form - ONLY INGREDIENTS */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Add Ingredient</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <select
                                value={selectedIngredient.ingredient_id}
                                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, ingredient_id: e.target.value })}
                                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Select Ingredient</option>
                                {allIngredients
                                    .filter(i => !ingredients.some(ing => ing.ingredient_id === i.id))
                                    .map(ing => (
                                        <option key={ing.id} value={ing.id}>
                                            {ing.name} ({ing.unit}) - Stock: {ing.quantity}
                                        </option>
                                    ))}
                            </select>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Quantity Required"
                                value={selectedIngredient.quantity_required}
                                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, quantity_required: e.target.value })}
                                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Wastage %</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="50"
                                    value={selectedIngredient.wastage_percentage}
                                    onChange={(e) => setSelectedIngredient({ 
                                        ...selectedIngredient, 
                                        wastage_percentage: parseFloat(e.target.value) || 0 
                                    })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Cooking Loss %</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="50"
                                    value={selectedIngredient.cooking_loss_percentage}
                                    onChange={(e) => setSelectedIngredient({ 
                                        ...selectedIngredient, 
                                        cooking_loss_percentage: parseFloat(e.target.value) || 0 
                                    })}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        <button
                            onClick={addIngredient}
                            disabled={!selectedIngredient.ingredient_id || !selectedIngredient.quantity_required}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={16} />
                            Add Ingredient
                        </button>
                    </div>

                    {/* Save Button */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={saveRecipe}
                            disabled={saving || ingredients.length === 0}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            {saving ? 'Saving...' : 'Save Recipe'}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeManager;