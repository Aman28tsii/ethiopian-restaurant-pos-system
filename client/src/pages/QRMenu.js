import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { ShoppingCart, Plus, Minus, X, Utensils, Phone, MapPin, Clock, Star, Trash2, CheckCircle, AlertCircle, Clock as ClockIcon, ChefHat, Truck, Receipt, Coffee } from 'lucide-react';

const QRMenu = () => {
  const [tableId, setTableId] = useState(null);
  const [tableNumber, setTableNumber] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQRGuide, setShowQRGuide] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [timer, setTimer] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(20);
  const [priceUpdate, setPriceUpdate] = useState(null);
  const [restaurantInfo, setRestaurantInfo] = useState({
    name: 'EthioPOS Restaurant',
    address: 'Addis Ababa, Ethiopia',
    phone: '+251-XXX-XXX-XXX',
    hours: '9:00 AM - 10:00 PM'
  });

  // Get table ID from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get('table');
    if (table) {
      setTableId(table);
      setTableNumber(table);
    }
    fetchProducts();
    loadRestaurantInfo();
    loadSavedOrder(); // NEW: Load saved order from localStorage
  }, []);

  // NEW: Load saved order from localStorage (survives page refresh)
  const loadSavedOrder = () => {
    const savedOrder = localStorage.getItem(`qr_order_table_${tableId}`);
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        setOrderNumber(order.order_number);
        setOrderPlaced(true);
        // Optionally fetch full order details
        if (order.order_number) {
          trackOrder(order.order_number);
        }
      } catch (e) {
        console.error('Error loading saved order:', e);
      }
    }
  };

  // NEW: Save order to localStorage
  const saveOrderToLocalStorage = (orderNum, total, status) => {
    localStorage.setItem(`qr_order_table_${tableId}`, JSON.stringify({
      order_number: orderNum,
      total_amount: total,
      status: status,
      placed_at: new Date().toISOString()
    }));
  };

  // NEW: Clear saved order from localStorage
  const clearSavedOrder = () => {
    localStorage.removeItem(`qr_order_table_${tableId}`);
    setOrderPlaced(false);
    setOrderNumber(null);
    setTrackingOrder(null);
  };

  // Timer effect for tracking
  useEffect(() => {
    let interval;
    if (trackingOrder && trackingOrder.created_at) {
      const createdTime = new Date(trackingOrder.created_at).getTime();
      
      interval = setInterval(() => {
        const now = new Date().getTime();
        const elapsedMinutes = Math.floor((now - createdTime) / 60000);
        setTimer(elapsedMinutes);
      }, 60000);
      
      const now = new Date().getTime();
      const elapsedMinutes = Math.floor((now - createdTime) / 60000);
      setTimer(elapsedMinutes);
    }
    return () => clearInterval(interval);
  }, [trackingOrder]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get('/products');
      const productsData = response.data.data || [];
      
      if (productsData.length === 0) {
        setError('No menu items found. Please contact the restaurant.');
      } else {
        setProducts(productsData);
        
        const uniqueCategories = ['all', ...new Set(productsData.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
      setError('Unable to load menu. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurantInfo = () => {
    const saved = localStorage.getItem('restaurantSettings');
    if (saved) {
      try {
        setRestaurantInfo(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading restaurant info:', e);
      }
    }
  };

  const trackOrder = async (orderNum) => {
    try {
      const response = await API.get(`/orders/track/${orderNum}`);
      if (response.data.success && response.data.data) {
        setTrackingOrder(response.data.data);
        calculateEstimatedTime(response.data.data);
        setShowOrderTracking(true);
      }
    } catch (err) {
      console.error('Track order error:', err);
    }
  };

  const calculateEstimatedTime = (orderData) => {
    const baseTime = 15;
    const itemCount = orderData.items?.length || 1;
    const additionalTime = Math.min(itemCount * 3, 15);
    let totalTime = baseTime + additionalTime;
    
    if (orderData.status === 'preparing') {
      totalTime = Math.max(5, totalTime - 5);
    } else if (orderData.status === 'ready' || orderData.status === 'completed') {
      totalTime = 0;
    }
    
    setEstimatedTime(totalTime);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <ClockIcon className="text-yellow-500" size={24} />;
      case 'preparing': return <ChefHat className="text-blue-500" size={24} />;
      case 'ready': return <CheckCircle className="text-green-500" size={24} />;
      case 'completed': return <Truck className="text-purple-500" size={24} />;
      default: return <ClockIcon className="text-gray-500" size={24} />;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Order Received';
      case 'preparing': return 'Being Prepared';
      case 'ready': return 'Ready for Pickup';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getStepStatus = (step, currentStatus) => {
    const steps = ['pending', 'preparing', 'ready', 'completed'];
    const currentIndex = steps.indexOf(currentStatus);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  const animatePriceUpdate = (itemId) => {
    setPriceUpdate(itemId);
    setTimeout(() => setPriceUpdate(null), 300);
  };

  const addToCart = (product) => {
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        const newCart = prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
            : item
        );
        animatePriceUpdate(product.id);
        return newCart;
      }
      animatePriceUpdate(product.id);
      return [...prevCart, {
        id: product.id,
        name: product.name,
        price: price,
        quantity: 1,
        total: price,
        description: product.description
      }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prevCart => {
      const item = prevCart.find(i => i.id === productId);
      if (!item) return prevCart;
      
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prevCart.filter(i => i.id !== productId);
      }
      
      animatePriceUpdate(productId);
      return prevCart.map(i =>
        i.id === productId
          ? { ...i, quantity: newQuantity, total: newQuantity * i.price }
          : i
      );
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to your order');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        table_id: tableId,
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone || null,
        notes: specialInstructions,
        order_type: 'dine_in',
        source: 'qr_menu'
      };

      const response = await API.post('/orders/qr-order', orderData);
      
      if (response.data.success) {
        const orderInfo = response.data.data;
        setOrderNumber(orderInfo.order_number);
        setOrderPlaced(true);
        setCart([]);
        // Save order to localStorage
        saveOrderToLocalStorage(orderInfo.order_number, orderInfo.total_amount, 'pending_confirmation');
        // Show tracking modal
        trackOrder(orderInfo.order_number);
      }
    } catch (err) {
      console.error('Place order error:', err);
      alert(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  // Order Tracking Modal
  if (showOrderTracking && trackingOrder) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Track Your Order</h2>
            <button onClick={() => {
              setShowOrderTracking(false);
              if (orderPlaced) {
                // Keep order placed state but close modal
              } else {
                setTrackingOrder(null);
              }
            }} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="bg-gray-700/50 rounded-xl p-3 text-center">
              <p className="text-gray-400 text-sm">Order Number</p>
              <p className="text-2xl font-bold text-white">{trackingOrder.order_number}</p>
            </div>
            
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Status</span>
                <span className={`font-semibold ${
                  trackingOrder.status === 'pending' ? 'text-yellow-400' :
                  trackingOrder.status === 'preparing' ? 'text-blue-400' :
                  trackingOrder.status === 'ready' ? 'text-green-400' :
                  'text-purple-400'
                }`}>
                  {getStatusText(trackingOrder.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Amount</span>
                <span className="text-green-400 font-bold">{formatCurrency(trackingOrder.total_amount)}</span>
              </div>
            </div>
            
            <div className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex justify-between mb-3">
                <span className="text-gray-400">Time Elapsed</span>
                <span className="text-white font-bold">{timer} min</span>
              </div>
              {estimatedTime > 0 && trackingOrder.status !== 'completed' && trackingOrder.status !== 'ready' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Remaining</span>
                  <span className="text-orange-400 font-bold">{estimatedTime} min</span>
                </div>
              )}
              {trackingOrder.status === 'ready' && (
                <div className="text-center text-green-400 font-semibold animate-pulse">
                  ✓ Ready for Pickup!
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-700 pt-3">
              <p className="text-gray-400 text-sm mb-2">Order Items:</p>
              {trackingOrder.items && trackingOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span className="text-gray-300">{item.quantity}x {item.product_name}</span>
                  <span className="text-white">{formatCurrency(item.total_price)}</span>
                </div>
              ))}
            </div>
            
            {orderPlaced && (
              <button
                onClick={() => {
                  setShowOrderTracking(false);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to Load Menu</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchProducts}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full p-8 text-center border border-gray-700">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Order Placed! 🎉</h2>
          <p className="text-gray-400 mb-4">Your order has been sent to the waiter for confirmation.</p>
          
          <div className="bg-gray-700/50 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-sm">Order Number</p>
            <p className="text-2xl font-bold text-blue-400">{orderNumber}</p>
          </div>
          
          <div className="bg-yellow-500/10 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <p className="text-yellow-400 text-sm">Waiting for waiter confirmation...</p>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mb-6">A waiter will come to your table shortly to confirm.</p>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                setOrderPlaced(false);
                setOrderNumber(null);
                clearSavedOrder();
              }}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition"
            >
              New Order
            </button>
            <button
              onClick={() => orderNumber && trackOrder(orderNumber)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full p-8 text-center">
          <Utensils size={48} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Menu Empty</h2>
          <p className="text-gray-400 mb-6">No menu items available. Please contact the restaurant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-30 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{restaurantInfo.name}</h1>
              <p className="text-xs text-blue-100">Table {tableNumber || 'Guest'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQRGuide(true)}
                className="bg-white/20 rounded-full p-2 hover:bg-white/30 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowCart(true)}
                className="relative bg-white/20 rounded-full p-2 hover:bg-white/30 transition"
              >
                <ShoppingCart size={24} />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-blue-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* QR Guide Modal */}
      {showQRGuide && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowQRGuide(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl max-w-sm w-full p-6 text-center border border-gray-700">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">How QR Ordering Works</h3>
              <p className="text-gray-400 text-sm mb-4">
                1. Scan the QR code at your table<br />
                2. Browse the menu and add items to your cart<br />
                3. Enter your name and special requests<br />
                4. Place your order - waiter will confirm!
              </p>
              <button
                onClick={() => setShowQRGuide(false)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Got it
              </button>
            </div>
          </div>
        </>
      )}

      {/* Restaurant Info Bar */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 py-2 px-4 flex overflow-x-auto gap-4 text-sm text-gray-300">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <MapPin size={14} className="text-blue-400" />
          <span>{restaurantInfo.address}</span>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Phone size={14} className="text-blue-400" />
          <span>{restaurantInfo.phone}</span>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Clock size={14} className="text-blue-400" />
          <span>{restaurantInfo.hours}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-gray-800/50 border-b border-gray-700 sticky top-[72px] z-20">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto gap-2 py-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {cat === 'all' ? 'All Items' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="container mx-auto px-4 py-6 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border border-gray-700">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{product.description || 'Delicious Ethiopian dish'}</p>
                    <p className="text-blue-400 font-bold mt-2">{formatCurrency(product.price)}</p>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="ml-3 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition transform hover:scale-105"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition transform hover:scale-105 z-40"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-blue-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
        </button>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowCart(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-800 shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600">
              <h2 className="text-xl font-bold text-white">Your Order</h2>
              <button onClick={() => setShowCart(false)} className="text-white hover:opacity-80">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={48} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500">Your cart is empty</p>
                  <p className="text-gray-400 text-sm">Tap on items to add</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className={`text-blue-400 text-sm ${priceUpdate === item.id ? 'animate-pulse' : ''}`}>
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500"
                          >
                            -
                          </button>
                          <span className="font-semibold text-white w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500"
                          >
                            +
                          </button>
                        </div>
                        <span className={`font-bold text-white ${priceUpdate === item.id ? 'animate-pulse' : ''}`}>
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 p-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>VAT (15%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-700">
                  <span>Total</span>
                  <span className="text-green-400">{formatCurrency(total)}</span>
                </div>
              </div>

              <input
                type="text"
                placeholder="Your name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg mb-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <input
                type="tel"
                placeholder="Your phone (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg mb-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                placeholder="Special instructions (allergies, preferences...)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg mb-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />

              <button
                onClick={placeOrder}
                disabled={cart.length === 0 || loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition disabled:opacity-50"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                After placing order, a waiter will come to confirm
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QRMenu;