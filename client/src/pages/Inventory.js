import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import API from '../api/axios';
import { Package, Plus, Edit2, Trash2, AlertTriangle, Search, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useDebounce } from '../hooks/useDebounce';

// Memoized table row component to prevent unnecessary re-renders
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
      </td>
      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ingredient.min_stock}</td>
      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatCurrency(ingredient.unit_cost)}</td>
      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ingredient.category || '-'}</td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(ingredient, 'ingredient')} 
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
            aria-label={t('edit')}
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete(ingredient.id, 'ingredient')} 
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
            aria-label={t('delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});

IngredientRow.displayName = 'IngredientRow';

const ProductRow = memo(({ product, onEdit, onDelete, toggleAvailability, formatCurrency }) => {
  const { t } = useLanguage();
  
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
      <td className="px-6 py-4 text-gray-900 dark:text-white">{product.name}</td>
      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatCurrency(product.price)}</td>
      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{product.category || '-'}</td>
      <td className="px-6 py-4">
        <button
          onClick={() => toggleAvailability(product)}
          className={`px-2 py-1 rounded-full text-xs font-semibold transition ${
            product.is_available 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50'
          }`}
        >
          {product.is_available ? t('available') : t('unavailable')}
        </button>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(product, 'product')} 
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
            aria-label={t('edit')}
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete(product.id, 'product')} 
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
            aria-label={t('delete')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});

ProductRow.displayName = 'ProductRow';

const Inventory = () => {
  const { t } = useLanguage();
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use debounced search to reduce filtering calculations
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    quantity: 0,
    min_stock: 0,
    unit_cost: 0,
    category: '',
    supplier: '',
    price: 0,
    description: '',
    is_available: true
  });

  // Fetch data - memoized to prevent unnecessary re-fetches
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'ingredients') {
        const response = await API.get('/ingredients');
        setIngredients(response.data.data || []);
      } else {
        const response = await API.get('/products');
        setProducts(response.data.data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memoized filtered data for better performance
  const filteredIngredients = useMemo(() => {
    if (!debouncedSearchTerm) return ingredients;
    const searchLower = debouncedSearchTerm.toLowerCase();
    return ingredients.filter(i =>
      i.name.toLowerCase().includes(searchLower) ||
      (i.category && i.category.toLowerCase().includes(searchLower))
    );
  }, [ingredients, debouncedSearchTerm]);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm) return products;
    const searchLower = debouncedSearchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      (p.category && p.category.toLowerCase().includes(searchLower))
    );
  }, [products, debouncedSearchTerm]);

  // Memoized low stock items
  const lowStockItems = useMemo(() => {
    return ingredients.filter(i => i.quantity <= i.min_stock);
  }, [ingredients]);

  // Memoized handlers to prevent recreation on each render
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (activeTab === 'ingredients') {
        if (editingItem) {
          await API.put(`/ingredients/${editingItem.id}`, formData);
        } else {
          await API.post('/ingredients', formData);
        }
      } else {
        const productData = {
          name: formData.name,
          price: formData.price,
          category: formData.category,
          description: formData.description,
          is_available: formData.is_available
        };
        
        if (editingItem) {
          await API.put(`/products/${editingItem.id}`, productData);
        } else {
          await API.post('/products', productData);
        }
      }
      resetModal();
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || t('saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [activeTab, editingItem, formData, fetchData, t]);

  const handleDelete = useCallback(async (id, type) => {
    if (window.confirm(t('deleteConfirm'))) {
      try {
        if (type === 'ingredient') {
          await API.delete(`/ingredients/${id}`);
        } else {
          await API.delete(`/products/${id}`);
        }
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || t('deleteFailed'));
      }
    }
  }, [fetchData, t]);

  const handleEdit = useCallback((item, type) => {
    if (type === 'ingredient') {
      setFormData({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        min_stock: item.min_stock,
        unit_cost: item.unit_cost,
        category: item.category || '',
        supplier: item.supplier || '',
        price: 0,
        description: '',
        is_available: true
      });
    } else {
      setFormData({
        name: item.name,
        unit: '',
        quantity: 0,
        min_stock: 0,
        unit_cost: 0,
        category: item.category || '',
        supplier: '',
        price: item.price,
        description: item.description || '',
        is_available: item.is_available
      });
    }
    setEditingItem(item);
    setShowModal(true);
  }, []);

  const toggleProductAvailability = useCallback(async (product) => {
    try {
      await API.put(`/products/${product.id}`, {
        ...product,
        is_available: !product.is_available
      });
      fetchData();
    } catch (err) {
      console.error('Toggle availability error:', err);
      alert(t('saveFailed'));
    }
  }, [fetchData, t]);

  const resetModal = useCallback(() => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      name: '',
      unit: '',
      quantity: 0,
      min_stock: 0,
      unit_cost: 0,
      category: '',
      supplier: '',
      price: 0,
      description: '',
      is_available: true
    });
    setIsSubmitting(false);
  }, []);

  const formatCurrency = useCallback((value) => {
    const num = parseFloat(value || 0);
    return `Br ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  // Memoized empty state component
  const EmptyState = useMemo(() => (
    <div className="text-center py-12">
      <Package size={48} className="mx-auto text-gray-500 dark:text-gray-400 mb-3" />
      <p className="text-gray-500 dark:text-gray-400">
        {activeTab === 'ingredients' ? t('noIngredientsFound') : t('noProductsFound')}
      </p>
    </div>
  ), [activeTab, t]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          {activeTab === 'ingredients' ? t('addIngredient') : t('addProduct')}
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && activeTab === 'ingredients' && (
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'ingredients'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {t('ingredients')}
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'products'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {t('products')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
        <input
          type="text"
          placeholder={`${t('search')} ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X size={18} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Ingredients Table */}
      {activeTab === 'ingredients' && (
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
      )}

      {/* Products Table */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('name')}</th>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('price')}</th>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('category')}</th>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('status')}</th>
                  <th className="px-6 py-3 text-gray-600 dark:text-gray-400 text-sm font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    toggleAvailability={toggleProductAvailability}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {filteredProducts.length === 0 && EmptyState}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingItem ? `${t('edit')} ${activeTab === 'ingredients' ? t('ingredient') : t('product')}` : `${t('addNew')} ${activeTab === 'ingredients' ? t('ingredient') : t('product')}`}
                </h2>
                <button 
                  onClick={resetModal} 
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Common fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')} *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('category')}</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('egVegetables')}
                />
              </div>

              {/* Ingredient-specific fields */}
              {activeTab === 'ingredients' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('unit')} *</label>
                    <select
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('minStock')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.min_stock}
                        onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
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
                        value={formData.unit_cost}
                        onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('supplier')}</label>
                      <input
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Product-specific fields */}
              {activeTab === 'products' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('price')} *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('description')}</label>
                    <textarea
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('description')}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_available"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_available" className="text-sm text-gray-700 dark:text-gray-300">
                      {t('available')}
                    </label>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                  {editingItem ? t('update') : t('create')}
                </button>
                <button 
                  type="button" 
                  onClick={resetModal} 
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition"
                >
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