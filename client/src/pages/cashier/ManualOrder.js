import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { 
  ShoppingCart, Plus, Minus, X, Utensils, Trash2, 
  CheckCircle, AlertCircle, Search, Users, Phone, 
  MapPin, CreditCard, Smartphone, DollarSign
} from 'lucide-react';

const ManualOrder = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchTables();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await API.get('/products');
      const productsData = response.data.data || [];
      setProducts(productsData);
      const uniqueCategories = ['all', ...new Set(productsData.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (err) {
      setError('Unable to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await API.get('/tables');
      setTables(response.data.data || []);
    } catch (err) {
      console.error('Fetch tables error:', err);
    }
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  const addToCart = (product) => {
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: price,
        quantity: 1,
        total: price
      }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === productId);
      if (!item) return prev;
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter(i => i.id !== productId);
      }
      return prev.map(i =>
        i.id === productId
          ? { ...i, quantity: newQuantity, total: newQuantity * i.price }
          : i
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    if (window.confirm('Clear entire cart?')) {
      setCart([]);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to order');
      return;
    }

    if (orderType === 'dine_in' && !selectedTableId) {
      alert('Please select a table for dine-in order');
      return;
    }

    setProcessing(true);
    try {
      const orderData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone || null,
        table_id: selectedTableId || null,
        order_type: orderType,
        notes: specialInstructions,
        source: 'cashier_manual',
        payment_method: paymentMethod
      };

      const response = await API.post('/orders', orderData);
      
      if (response.data.success) {
        setOrderNumber(response.data.data.order_number);
        setOrderComplete(true);
        setCart([]);
      }
    } catch (err) {
      console.error('Place order error:', err);
      alert(err.response?.data?.error || 'Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setSpecialInstructions('');
    setSelectedTableId('');
    setOrderType('dine_in');
    setPaymentMethod('cash');
    setSearchTerm('');
  };

  const startNewOrder = () => {
    setOrderComplete(false);
    setOrderNumber(null);
    resetForm();
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Order Complete!</h2>
          <p className="text-gray-400 mb-4">Order has been sent to the kitchen.</p>
          
          <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
            <p className="text-gray-400 text-sm">Order Number</p>
            <p className="text-2xl font-bold text-blue-400">{orderNumber}</p>
            <p className="text-green-400 font-bold mt-2">{formatCurrency(total)}</p>
          </div>
          
          <button
            onClick={startNewOrder}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
          >
            New Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Left Panel - Products */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Manual Order Entry</h1>
          <p className="text-gray-400 mt-1">Create orders for phone calls or walk-in customers</p>
        </div>

        {/* Order Type Selector */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="dine_in" checked={orderType === 'dine_in'} onChange={(e) => setOrderType(e.target.value)} className="w-4 h-4 text-blue-600" />
              <span className="text-white">Dine In</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="takeaway" checked={orderType === 'takeaway'} onChange={(e) => setOrderType(e.target.value)} className="w-4 h-4 text-blue-600" />
              <span className="text-white">Takeaway</span>
            </label>
          </div>

          {orderType === 'dine_in' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Table</label>
              <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value="">-- Select Table --</option>
                {tables.filter(t => t.status === 'available').map(table => (
                  <option key={table.id} value={table.id}>Table {table.table_number} (Capacity: {table.capacity})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search and Categories */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-3 pl-10 bg-gray-700 border border-gray-600 rounded-xl text-white" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                {cat === 'all' ? 'All Items' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="h-[calc(100vh-380px)] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map(product => (
              <button key={product.id} onClick={() => addToCart(product)} className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-left hover:border-blue-500 transition">
                <div className="text-2xl mb-1">🍽️</div>
                <h3 className="font-semibold text-white text-sm mb-1">{product.name}</h3>
                <p className="text-blue-400 font-bold text-sm">{formatCurrency(product.price)}</p>
                <span className="text-xs text-green-400 mt-1 inline-block">+ Add</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-96 bg-gray-800 rounded-2xl border border-gray-700 flex flex-col h-[calc(100vh-120px)] sticky top-6">
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={24} className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">Current Order</h2>
            </div>
            {cart.length > 0 && <button onClick={clearCart} className="text-red-400 text-sm">Clear All</button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-gray-700 rounded-xl p-3">
                <div className="flex justify-between items-start mb-2">
                  <div><h3 className="font-semibold text-white">{item.name}</h3><p className="text-blue-400 text-sm">{formatCurrency(item.price)}</p></div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">-</button>
                    <span className="text-white font-semibold text-lg w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">+</button>
                  </div>
                  <span className="text-white font-bold">{formatCurrency(item.total)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-700 p-4 space-y-3">
          <input type="text" placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
          <input type="tel" placeholder="Customer phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" />
          <textarea placeholder="Special instructions..." value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" rows={2} />

          <div>
            <p className="text-gray-400 text-sm mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}><DollarSign size={16} /> Cash</button>
              <button onClick={() => setPaymentMethod('card')} className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${paymentMethod === 'card' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}><CreditCard size={16} /> Card</button>
              <button onClick={() => setPaymentMethod('mobile')} className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${paymentMethod === 'mobile' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}><Smartphone size={16} /> Mobile</button>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-700">
            <div className="flex justify-between text-gray-400 text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-gray-400 text-sm"><span>VAT (15%)</span><span>{formatCurrency(tax)}</span></div>
            <div className="flex justify-between text-white font-bold text-lg pt-2"><span>Total</span><span className="text-green-400">{formatCurrency(total)}</span></div>
          </div>

          <button onClick={placeOrder} disabled={cart.length === 0 || processing} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition disabled:opacity-50">
            {processing ? 'Processing...' : 'Complete Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualOrder;