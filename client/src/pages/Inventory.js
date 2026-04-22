import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Package, Plus, Edit2, Trash2, AlertTriangle, Search, X } from 'lucide-react';

const Inventory = () => {
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    quantity: 0,
    min_stock: 0,
    unit_cost: 0,
    category: '',
    supplier: ''
  });

  useEffect(() => {
  fetchData();
}, [activeTab]);

  const fetchData = async () => {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'ingredients') {
        if (editingItem) {
          await API.put(`/ingredients/${editingItem.id}`, formData);
        } else {
          await API.post('/ingredients', formData);
        }
      }
      resetModal();
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await API.delete(`/${activeTab}/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete');
      }
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      name: '',
      unit: '',
      quantity: 0,
      min_stock: 0,
      unit_cost: 0,
      category: '',
      supplier: ''
    });
  };

  const lowStockItems = ingredients.filter(i => i.quantity <= i.min_stock);

  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          <p className="text-gray-400 mt-1">Manage products and ingredients</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition"
        >
          <Plus size={18} />
          Add {activeTab === 'ingredients' ? 'Ingredient' : 'Product'}
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-semibold">Low Stock Alert</p>
              <p className="text-gray-400 text-sm">{lowStockItems.length} ingredients are below minimum stock level</p>
            </div>
          </div>
          <button className="text-yellow-400 text-sm hover:underline">View Details</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'ingredients'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Ingredients
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'products'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Products
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        /* Ingredients Table */
        activeTab === 'ingredients' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Name</th>
                    <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Unit</th>
                    <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Stock</th>
                    <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Min Stock</th>
                    <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Unit Cost</th>
                    <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Category</th>
                    <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredIngredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 text-white">{ing.name}</td>
                      <td className="px-6 py-4 text-gray-300">{ing.unit}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${ing.quantity <= ing.min_stock ? 'text-red-400' : 'text-green-400'}`}>
                          {ing.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{ing.min_stock}</td>
                      <td className="px-6 py-4 text-gray-300">Br {parseFloat(ing.unit_cost).toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-300">{ing.category || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(ing);
                              setFormData(ing);
                              setShowModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(ing.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredIngredients.length === 0 && (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">No ingredients found</p>
              </div>
            )}
          </div>
        )
      )}

      {/* Products Table */}
      {activeTab === 'products' && !loading && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Name</th>
                  <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Price</th>
                  <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Category</th>
                  <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-gray-400 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 text-white">{product.name}</td>
                    <td className="px-6 py-4 text-gray-300">Br {parseFloat(product.price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-300">{product.category || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.is_available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {product.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-400 hover:text-blue-300">
                          <Edit2 size={16} />
                        </button>
                        <button className="text-red-400 hover:text-red-300">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editingItem ? `Edit ${activeTab === 'ingredients' ? 'Ingredient' : 'Product'}` : `Add New ${activeTab === 'ingredients' ? 'Ingredient' : 'Product'}`}
                </h2>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {activeTab === 'ingredients' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Unit *</label>
                      <select
                        required
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select unit</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="L">Liter (L)</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="pcs">Pieces (pcs)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Min Stock</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.min_stock}
                          onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Unit Cost</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.unit_cost}
                          onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Vegetables"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Supplier</label>
                      <input
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'products' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                      <textarea
                        rows="3"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={resetModal} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;