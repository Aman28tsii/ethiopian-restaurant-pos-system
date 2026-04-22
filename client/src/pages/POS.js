import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { 
  Plus, Minus, Trash2, ShoppingCart, CreditCard, Smartphone, 
  DollarSign, Search, X, AlertCircle, Printer 
} from 'lucide-react';

const POS = ({ userRole = 'cashier' }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // NEW: Role-based mode detection
  const isWaiterMode = userRole === 'waiter';
  const isCashierMode = userRole === 'cashier' || userRole === 'manager' || userRole === 'owner';

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await API.get('/products');
      // Parse price as number for each product
      const productsData = (response.data.data || []).map(product => ({
        ...product,
        price: typeof product.price === 'string' ? parseFloat(product.price) : product.price
      }));
      setProducts(productsData);
      setError('');
    } catch (err) {
      console.error('Fetch products error:', err);
      setError('Failed to load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Add to cart
  const addToCart = (product) => {
    // Ensure price is a number
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
            : item
        );
      }
      return [...prevCart, {
        id: product.id,
        name: product.name,
        price: price,
        quantity: 1,
        total: price
      }];
    });
  };

  // Update quantity
  const updateQuantity = (productId, delta) => {
    setCart(prevCart => {
      const item = prevCart.find(i => i.id === productId);
      if (!item) return prevCart;
      
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prevCart.filter(i => i.id !== productId);
      }
      
      return prevCart.map(i =>
        i.id === productId
          ? { ...i, quantity: newQuantity, total: newQuantity * i.price }
          : i
      );
    });
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  // Clear cart
  const clearCart = () => {
    if (window.confirm('Clear entire cart?')) {
      setCart([]);
      setShowCheckout(false);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.15; // 15% VAT
  const total = subtotal + tax;

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category))];

  // NEW: Send order to kitchen (for Waiter mode)
  const sendToKitchen = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      const orderData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: 'pending',
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        status: 'pending'
      };
      
      const response = await API.post('/orders', orderData);
      
      if (response.data.success) {
        alert(`Order #${response.data.order?.order_number || 'created'} sent to kitchen!`);
        setCart([]);
        setShowCheckout(false);
        setCustomerName('');
        setCustomerPhone('');
        setError('');
      }
      
    } catch (err) {
      console.error('Send to kitchen error:', err);
      setError(err.response?.data?.error || 'Failed to send order to kitchen');
    } finally {
      setProcessing(false);
    }
  };

  // Process order - Connect to real backend (for Cashier mode)
  const processOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      const orderData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: paymentMethod,
        customer_name: customerName || null,
        customer_phone: customerPhone || null
      };
      
      const response = await API.post('/sales', orderData);
      
      if (response.data.success) {
        const sale = response.data.data;
        alert(`Sale completed!\nSale #: ${sale.sale_number}\nTotal: Br ${sale.total_amount.toFixed(2)}\nProfit: Br ${sale.profit.toFixed(2)}`);
        
        setCart([]);
        setShowCheckout(false);
        setCustomerName('');
        setCustomerPhone('');
        setError('');
        
        fetchProducts();
      }
      
    } catch (err) {
      console.error('Order error:', err);
      setError(err.response?.data?.error || 'Failed to process order');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* Left Panel - Products Grid */}
      <div className="flex-1 min-w-0">
        {/* Role Badge */}
        <div className="mb-4 flex justify-end">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isWaiterMode 
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
          }`}>
            {isWaiterMode ? 'Waiter Mode - Orders go to Kitchen' : 'Cashier Mode - Process Payments'}
          </div>
        </div>

        {/* Search and Categories */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
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
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat === 'all' ? 'All Items' : cat}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 mb-4">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Products Grid */}
        <div className="h-[calc(100vh-280px)] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-gray-800 border border-gray-700 rounded-xl p-3 hover:border-blue-500 hover:scale-105 transition-all duration-200 text-left"
              >
                <div className="text-3xl mb-2">🍽️</div>
                <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-blue-400 font-bold text-base">Br {typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Stock: {product.stock || 'N/A'}</p>
              </button>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart - Fixed width */}
      <div className="w-96 flex-shrink-0 bg-gray-800 rounded-2xl border border-gray-700 flex flex-col h-[calc(100vh-120px)] sticky top-6">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={24} className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">Current Order</h2>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-red-400 hover:text-red-300 text-sm font-semibold">
                Clear All
              </button>
            )}
          </div>
          {isWaiterMode && (
            <p className="text-xs text-orange-400 mt-2">Orders will be sent to kitchen for preparation</p>
          )}
        </div>

        {/* Cart Items - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500">Cart is empty</p>
              <p className="text-gray-600 text-sm">Tap products to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-gray-700 rounded-xl p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                    <p className="text-blue-400 text-sm">Br {item.price.toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 ml-2">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 transition"
                    >
                      <Minus size={16} className="text-white" />
                    </button>
                    <span className="text-white font-semibold text-lg w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 transition"
                    >
                      <Plus size={16} className="text-white" />
                    </button>
                  </div>
                  <span className="text-white font-bold">Br {item.total.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary - Fixed at bottom */}
        {cart.length > 0 && (
          <div className="border-t border-gray-700 p-4">
            {!showCheckout ? (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>Br {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>VAT (15%)</span>
                    <span>Br {tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-xl pt-2 border-t border-gray-700">
                    <span>Total</span>
                    <span>Br {total.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Role-based action button */}
                {isWaiterMode ? (
                  <button
                    onClick={sendToKitchen}
                    disabled={processing}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50"
                  >
                    {processing ? 'Sending...' : 'Send to Kitchen'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all"
                  >
                    Proceed to Checkout
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
                
                <input
                  type="tel"
                  placeholder="Customer phone (optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      paymentMethod === 'cash' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <DollarSign size={16} />
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      paymentMethod === 'card' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <CreditCard size={16} />
                    Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('mobile')}
                    className={`py-2 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      paymentMethod === 'mobile' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Smartphone size={16} />
                    Mobile
                  </button>
                </div>

                <div className="bg-gray-700 rounded-xl p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Items:</span>
                    <span className="text-white">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg mt-1">
                    <span className="text-gray-400">Total:</span>
                    <span className="text-white font-bold">Br {total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={processOrder}
                    disabled={processing}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Complete Order'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;