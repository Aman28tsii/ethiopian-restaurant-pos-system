import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import API from '../api/axios';
import { Package, Plus, Edit2, Trash2, AlertTriangle, Search, X, Loader2, ChefHat, Wine } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useDebounce } from '../hooks/useDebounce';

const IngredientRow = memo(({ ingredient, onEdit, onDelete, formatCurrency }) => {
    const { t } = useLanguage();
    const isLowStock = ingredient.quantity <= ingredient.min_stock;
    
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <td className="px-6 py-4 text-gray-900 dark:text-white">{ingredient.name}</td>
            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ingredient.unit}</td>
            <td className="px-6 py-4">
                <span className={`font-semibold ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {ingredient.quantity}
                </span>
                {ingredient.safety_stock > 0 && (
                    <span className="text-xs text-gray-500 ml-1">(Safety: {ingredient.safety_stock})</span>
                )}
            </td>
            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ingredient.min_stock}</td>
            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatCurrency(ingredient.unit_cost)}</td>
            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ingredient.category || '-'}</td>
            <td className="px-6 py-4">
                <div className="flex gap-2">
                    <button onClick={() => onEdit(ingredient, 'ingredient')} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 transition">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(ingredient.id, 'ingredient')} className="text-red-600 dark:text-red-400 hover:text-red-700 transition">
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
});

IngredientRow.displayName = 'IngredientRow';

const Inventory = () => {
    const { t } = useLanguage();
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ingredients');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    
    // Form data with wastage fields
    const [ingredientForm, setIngredientForm] = useState({
        name: '',
        unit: '',
        quantity: 0,
        min_stock: 0,
        unit_cost: 0,
        category: '',
        supplier: '',
        default_wastage_percentage: 0,
        default_cooking_loss_percentage: 0,
        safety_stock: 0
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await API.get('/ingredients');
            setIngredients(response.data.data || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredIngredients = useMemo(() => {
        if (!debouncedSearchTerm) return ingredients;
        const searchLower = debouncedSearchTerm.toLowerCase();
        return ingredients.filter(i =>
            i.name.toLowerCase().includes(searchLower) ||
            (i.category && i.category.toLowerCase().includes(searchLower))
        );
    }, [ingredients, debouncedSearchTerm]);

    const lowStockItems = useMemo(() => {
        return ingredients.filter(i => i.quantity <= i.min_stock);
    }, [ingredients]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            if (editingItem) {
                await API.put(`/ingredients/${editingItem.id}`, ingredientForm);
            } else {
                await API.post('/ingredients', ingredientForm);
            }
            resetModal();
            fetchData();
        } catch (err) {
            console.error('Save error:', err);
            alert(err.response?.data?.error || t('saveFailed'));
        } finally {
            setIsSubmitting(false);
        }
    }, [editingItem, ingredientForm, fetchData, t]);

    const handleDelete = useCallback(async (id, type) => {
        if (window.confirm(t('deleteConfirm'))) {
            try {
                await API.delete(`/ingredients/${id}`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.error || t('deleteFailed'));
            }
        }
    }, [fetchData, t]);

    const handleEdit = useCallback((item, type) => {
        if (type === 'ingredient') {
            setIngredientForm({
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                min_stock: item.min_stock,
                unit_cost: item.unit_cost,
                category: item.category || '',
                supplier: item.supplier || '',
                default_wastage_percentage: item.default_wastage_percentage || 0,
                default_cooking_loss_percentage: item.default_cooking_loss_percentage || 0,
                safety_stock: item.safety_stock || 0
            });
        }
        setEditingItem(item);
        setShowModal(true);
    }, []);

    const resetModal = useCallback(() => {
        setShowModal(false);
        setEditingItem(null);
        setIngredientForm({
            name: '',
            unit: '',
            quantity: 0,
            min_stock: 0,
            unit_cost: 0,
            category: '',
            supplier: '',
            default_wastage_percentage: 0,
            default_cooking_loss_percentage: 0,
            safety_stock: 0
        });
        setIsSubmitting(false);
    }, []);

    const formatCurrency = useCallback((value) => {
        const num = parseFloat(value || 0);
        return `Br ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, []);

    const EmptyState = useMemo(() => (
        <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-500 dark:text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
                {t('noIngredientsFound')}
            </p>
        </div>
    ), [t]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('inventoryManagement')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('manageProductsAndIngredients')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition"
                >
                    <Plus size={18} />
                    {t('addIngredient')}
                </button>
            </div>

            {lowStockItems.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-500" />
                        <div>
                            <p className="text-yellow-700 dark:text-yellow-400 font-semibold">{t('lowStockAlert')}</p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">{lowStockItems.length} {t('ingredientsBelowMinStock')}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder={`${t('search')} ${t('ingredients')}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X size={18} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('name')}</th>
                                <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('unit')}</th>
                                <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('stock')}</th>
                                <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('minStock')}</th>
                                <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('unitCost')}</th>
                                <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('category')}</th>
                                <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredIngredients.map(ing => (
                                <IngredientRow
                                    key={ing.id}
                                    ingredient={ing}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    formatCurrency={formatCurrency}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredIngredients.length === 0 && EmptyState}
            </div>

            {/* Add/Edit Ingredient Modal with Wastage Fields */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingItem ? `${t('edit')} ${t('ingredient')}` : `${t('addNew')} ${t('ingredient')}`}
                                </h2>
                                <button onClick={resetModal} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')} *</label>
                                <input
                                    type="text"
                                    required
                                    value={ingredientForm.name}
                                    onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('category')}</label>
                                <input
                                    type="text"
                                    value={ingredientForm.category}
                                    onChange={(e) => setIngredientForm({ ...ingredientForm, category: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder={t('egVegetables')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('unit')} *</label>
                                <select
                                    required
                                    value={ingredientForm.unit}
                                    onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{t('selectUnit')}</option>
                                    <option value="kg">{t('kilogram')}</option>
                                    <option value="g">{t('gram')}</option>
                                    <option value="L">{t('liter')}</option>
                                    <option value="ml">{t('milliliter')}</option>
                                    <option value="pcs">{t('pieces')}</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quantity')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={ingredientForm.quantity}
                                        onChange={(e) => setIngredientForm({ ...ingredientForm, quantity: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('minStock')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={ingredientForm.min_stock}
                                        onChange={(e) => setIngredientForm({ ...ingredientForm, min_stock: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('unitCost')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={ingredientForm.unit_cost}
                                        onChange={(e) => setIngredientForm({ ...ingredientForm, unit_cost: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('supplier')}</label>
                                    <input
                                        type="text"
                                        value={ingredientForm.supplier}
                                        onChange={(e) => setIngredientForm({ ...ingredientForm, supplier: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* NEW: Wastage Fields */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('wastageSettings')}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('defaultWastage')} (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="50"
                                            value={ingredientForm.default_wastage_percentage}
                                            onChange={(e) => setIngredientForm({ 
                                                ...ingredientForm, 
                                                default_wastage_percentage: parseFloat(e.target.value) || 0 
                                            })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Trimming, spoilage, spillage</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('cookingLoss')} (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="50"
                                            value={ingredientForm.default_cooking_loss_percentage}
                                            onChange={(e) => setIngredientForm({ 
                                                ...ingredientForm, 
                                                default_cooking_loss_percentage: parseFloat(e.target.value) || 0 
                                            })}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Evaporation, shrinkage</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('safetyStock')}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={ingredientForm.safety_stock}
                                        onChange={(e) => setIngredientForm({ 
                                            ...ingredientForm, 
                                            safety_stock: parseFloat(e.target.value) || 0 
                                        })}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Extra stock kept as buffer</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                                    {editingItem ? t('update') : t('create')}
                                </button>
                                <button type="button" onClick={resetModal} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition">
                                    {t('cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;