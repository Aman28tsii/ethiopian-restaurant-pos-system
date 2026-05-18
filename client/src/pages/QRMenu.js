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
  }, []);

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
        
        // Extract unique categories from real data
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
        setOrderNumber(response.data.data.order_number);
        setOrderPlaced(true);
        setCart([]);
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

  // Order Placed Screen - Waiting for Waiter Confirmation
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="order-success bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center transform transition-all">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <ClockIcon size={40} className="text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Received! 🍽️</h2>
          <p className="text-gray-600 mb-4">Your order has been sent to the waiter for confirmation.</p>
          
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              {orderNumber}
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-600">Waiting for waiter to confirm your order...</p>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mb-6">A waiter will come to your table shortly to confirm your order.</p>
          
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition transform hover:scale-105"
            >
              New Order
            </button>
            <button
              onClick={() => trackOrder(orderNumber)}
              className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl font-semibold transition transform hover:scale-105"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Order Tracking Screen
  if (showOrderTracking && trackingOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <button
            onClick={() => setShowOrderTracking(false)}
            className="mb-4 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
          >
            ← Back to Menu
          </button>

          <div className="space-y-6">
            {/* Order Header */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <p className="text-gray-400 text-sm">Order Number</p>
                  <p className="text-2xl font-bold text-white">{trackingOrder.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Total Amount</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(trackingOrder.total_amount)}</p>
                </div>
              </div>

              {/* Status Badge - Show pending confirmation if applicable */}
              {trackingOrder.status === 'pending_confirmation' && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 mb-4 text-center">
                  <p className="text-yellow-400 text-sm">⏳ Waiting for waiter confirmation...</p>
                </div>
              )}

              {/* Timer */}
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="text-blue-400 timer-animation" size={24} />
                    <div>
                      <p className="text-gray-400 text-sm">Time Elapsed</p>
                      <p className="text-2xl font-bold text-white">{timer} min</p>
                    </div>
                  </div>
                  {estimatedTime > 0 && trackingOrder.status !== 'completed' && trackingOrder.status !== 'ready' && trackingOrder.status !== 'pending_confirmation' && (
                    <div className="flex items-center gap-3">
                      <ChefHat className="text-orange-400 timer-animation" size={24} />
                      <div>
                        <p className="text-gray-400 text-sm">Estimated Remaining</p>
                        <p className="text-2xl font-bold text-orange-400">{estimatedTime} min</p>
                      </div>
                    </div>
                  )}
                  {trackingOrder.status === 'ready' && (
                    <div className="flex items-center gap-3 animate-pulse">
                      <CheckCircle className="text-green-400" size={24} />
                      <div>
                        <p className="text-gray-400 text-sm">Status</p>
                        <p className="text-xl font-bold text-green-400">Ready for Pickup!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Timeline - Skip if pending confirmation */}
              {trackingOrder.status !== 'pending_confirmation' && (
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-4">Order Progress</p>
                  <div className="relative">
                    <div className="absolute top-5 left-0 right-0 h-1 bg-gray-700 rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${
                            trackingOrder.status === 'pending' ? '25%' :
                            trackingOrder.status === 'preparing' ? '50%' :
                            trackingOrder.status === 'ready' ? '75%' :
                            '100%'
                          }` 
                        }}
                      />
                    </div>
                    
                    <div className="relative flex justify-between">
                      <div className="text-center timeline-step">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 z-10 relative transition-all ${
                          getStepStatus('pending', trackingOrder.status) === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          getStepStatus('pending', trackingOrder.status) === 'current' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse' :
                          'bg-gray-700'
                        }`}>
                          <CheckCircle size={16} className="text-white" />
                        </div>
                        <p className="text-xs text-gray-400">Order Placed</p>
                      </div>
                      
                      <div className="text-center timeline-step">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 z-10 relative transition-all ${
                          getStepStatus('preparing', trackingOrder.status) === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          getStepStatus('preparing', trackingOrder.status) === 'current' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse' :
                          'bg-gray-700'
                        }`}>
                          <ChefHat size={16} className="text-white" />
                        </div>
                        <p className="text-xs text-gray-400">Preparing</p>
                      </div>
                      
                      <div className="text-center timeline-step">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 z-10 relative transition-all ${
                          getStepStatus('ready', trackingOrder.status) === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          getStepStatus('ready', trackingOrder.status) === 'current' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse' :
                          'bg-gray-700'
                        }`}>
                          <Coffee size={16} className="text-white" />
                        </div>
                        <p className="text-xs text-gray-400">Ready</p>
                      </div>
                      
                      <div className="text-center timeline-step">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 z-10 relative transition-all ${
                          getStepStatus('completed', trackingOrder.status) === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          getStepStatus('completed', trackingOrder.status) === 'current' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse' :
                          'bg-gray-700'
                        }`}>
                          <Truck size={16} className="text-white" />
                        </div>
                        <p className="text-xs text-gray-400">Completed</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-white font-semibold mb-3">Order Items</h3>
                <div className="space-y-2">
                  {trackingOrder.items && trackingOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-gray-300">
                      <span>{item.quantity}x {item.product_name}</span>
                      <span>{formatCurrency(item.total_price)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-between font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-green-400">{formatCurrency(trackingOrder.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Load Menu</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchProducts}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <Utensils size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Menu Empty</h2>
          <p className="text-gray-600 mb-6">No menu items available. Please contact the restaurant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white sticky top-0 z-30 shadow-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold bg-white/20 backdrop-blur-sm inline-block px-3 py-1 rounded-full">
                {restaurantInfo.name}
              </h1>
              <p className="text-xs text-white/90 mt-1">Table {tableNumber || 'Guest'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQRGuide(true)}
                className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition transform hover:scale-110"
                title="How to use QR ordering"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowCart(true)}
                className="relative bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition transform hover:scale-110"
              >
                <ShoppingCart size={24} />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
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
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setShowQRGuide(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center transform transition-all animate-bounce">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">How QR Ordering Works</h3>
              <p className="text-gray-600 text-sm mb-4">
                1. Scan the QR code at your table<br />
                2. Browse the menu and add items to your cart<br />
                3. Enter your name and special requests<br />
                4. Place your order - waiter will confirm!
              </p>
              <button
                onClick={() => setShowQRGuide(false)}
                className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </>
      )}

      {/* Restaurant Info Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 py-2 px-4 flex overflow-x-auto gap-4 text-sm text-gray-600 sticky top-[72px] z-20">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <MapPin size={14} className="text-indigo-500" />
          <span>{restaurantInfo.address}</span>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Phone size={14} className="text-indigo-500" />
          <span>{restaurantInfo.phone}</span>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Clock size={14} className="text-indigo-500" />
          <span>{restaurantInfo.hours}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-[108px] z-20">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto gap-2 py-3 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`category-tab px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all duration-300 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className={`qr-menu-card bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
                !product.is_available ? 'opacity-60' : ''
              }`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                      <h3 className="font-bold text-gray-800 text-lg">{product.name}</h3>
                      {!product.is_available && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Unavailable</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{product.description || 'Delicious Ethiopian dish'}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Br {parseFloat(product.price).toFixed(2)}
                      </p>
                      {product.is_available !== false && (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:rotate-12 shadow-md"
                        >
                          <Plus size={20} />
                        </button>
                      )}
                    </div>
                  </div>
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
          className="floating-cart-btn fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 transform hover:scale-110 z-40 group"
        >
          <div className="relative">
            <ShoppingCart size={28} />
            <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
        </button>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all" onClick={() => setShowCart(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 animate-slide-in">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <h2 className="text-xl font-bold">Your Order</h2>
              <button onClick={() => setShowCart(false)} className="text-white hover:opacity-80 transition transform hover:rotate-90">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 cart-items-container">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">Your cart is empty</p>
                  <p className="text-gray-400 text-sm mt-2">Tap on items to add</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-4 transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-lg">{item.name}</h3>
                          <p className={`text-indigo-600 font-bold mt-1 ${priceUpdate === item.id ? 'price-update' : ''}`}>
                            Br {item.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 hover:text-red-600 transition transform hover:scale-110"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="qty-btn w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition transform hover:scale-110"
                          >
                            <span className="text-gray-600 font-bold text-lg">-</span>
                          </button>
                          <span className="font-semibold text-gray-800 text-lg w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="qty-btn w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition transform hover:scale-110"
                          >
                            <span className="text-gray-600 font-bold text-lg">+</span>
                          </button>
                        </div>
                        <span className={`font-bold text-gray-800 text-lg ${priceUpdate === item.id ? 'price-update' : ''}`}>
                          Br {item.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-5 bg-gray-50">
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className={`font-medium ${subtotal > 0 ? 'price-update' : ''}`}>Br {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT (15%)</span>
                  <span>Br {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-800 font-bold text-xl pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Br {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <input
                type="text"
                placeholder="Your name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              
              <input
                type="tel"
                placeholder="Your phone (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />

              <textarea
                placeholder="Special instructions (allergies, preferences...)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                rows={2}
              />

              <button
                onClick={placeOrder}
                disabled={cart.length === 0 || loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Placing Order...
                  </div>
                ) : (
                  'Place Order'
                )}
              </button>
              
              <p className="text-xs text-gray-400 text-center mt-3">
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