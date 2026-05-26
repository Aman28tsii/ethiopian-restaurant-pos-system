import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Package, Plus, Edit2, Trash2, Search, X, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Category-based emoji mapping
const getCategoryEmoji = (category) => {
  const emojis = {
    'Main Course': '🍛',
    'Beverage': '🥤',
    'Drink': '🥤',
    'Juice': '🧃',
    'Coffee': '☕',
    'Tea': '🍵',
    'Dessert': '🍰',
    'Appetizer': '🍢',
    'Soup': '🍲',
    'Salad': '🥗',
    'Breakfast': '🍳',
    'Lunch': '🍱',
    'Dinner': '🍽️',
    'Special': '⭐',
    'Traditional': '🇪🇹',
    'Ethiopian': '🇪🇹'
  };
  return emojis[category] || '🍽️';
};

const Products = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: '',
    description: '',
    is_available: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await API.get('/products');
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        name: formData.name,
        price: formData.price,
        category: formData.category,
        description: formData.description,
        is_available: formData.is_available
      };
      
      if (editingProduct) {
        await API.put(`/products/${editingProduct.id}`, productData);
        alert('Product updated successfully!');
      } else {
        await API.post('/products', productData);
        alert('Product created successfully!');
      }
      resetModal();
      fetchProducts();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await API.delete(`/products/${id}`);
        alert('Product deleted successfully!');
        fetchProducts();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete product');
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category || '',
      description: product.description || '',
      is_available: product.is_available
    });
    setShowModal(true);
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      price: 0,
      category: '',
      description: '',
      is_available: true
    });
  };

  const toggleAvailability = async (product) => {
    try {
      await API.put(`/products/${product.id}`, {
        ...product,
        is_available: !product.is_available
      });
      fetchProducts();
    } catch (err) {
      console.error('Toggle error:', err);
      alert('Failed to update product status');
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Products Management</h1>
          <p className="text-gray-400 mt-1">Manage your restaurant menu products</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {cat === 'all' ? 'All Products' : cat}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={18} className="text-gray-500 hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Products Grid with Emojis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-all">
            {/* Emoji Icon */}
            <div className="h-32 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-6xl">{getCategoryEmoji(product.category)}</span>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-white text-lg">{product.name}</h3>
                  {product.category && (
                    <p className="text-gray-400 text-xs mt-1">{product.category}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleAvailability(product)}
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    product.is_available 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {product.is_available ? 'Available' : 'Unavailable'}
                </button>
              </div>
              
              <p className="text-blue-400 font-bold text-xl">{formatCurrency(product.price)}</p>
              
              {product.description && (
                <p className="text-gray-400 text-sm mt-2 line-clamp-2">{product.description}</p>
              )}
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(product)}
                  className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="flex-1 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <Package size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500">No products found</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Add your first product
          </button>
        </div>
      )}

      {/* Add/Edit Product Modal - No Image Upload */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 bg-gray-800 p-5 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={resetModal} className="text-gray-400 hover:text-gray-300">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Doro Wat, Kitfo, Tibs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="Main Course">🍛 Main Course</option>
                  <option value="Beverage">🥤 Beverage</option>
                  <option value="Coffee">☕ Coffee</option>
                  <option value="Tea">🍵 Tea</option>
                  <option value="Dessert">🍰 Dessert</option>
                  <option value="Appetizer">🍢 Appetizer</option>
                  <option value="Soup">🍲 Soup</option>
                  <option value="Salad">🥗 Salad</option>
                  <option value="Breakfast">🍳 Breakfast</option>
                  <option value="Traditional">🇪🇹 Traditional</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Product description..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_available" className="text-sm text-gray-300">
                  Available for sale
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">
                  {editingProduct ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetModal} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;