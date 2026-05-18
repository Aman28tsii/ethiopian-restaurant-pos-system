import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Clock, CheckCircle, Coffee, ChefHat, Truck, AlertCircle, RefreshCw, ShoppingBag, Phone, MapPin, Calendar } from 'lucide-react';

const TrackOrder = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [timer, setTimer] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(20);

  // Get order number from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const order = urlParams.get('order');
    if (order) {
      setOrderNumber(order);
      fetchOrder(order);
    }
  }, []);

  // Timer effect - counts up from order creation
  useEffect(() => {
    let interval;
    if (order && order.created_at) {
      const createdTime = new Date(order.created_at).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const elapsedMinutes = Math.floor((now - createdTime) / 60000);
        setTimer(elapsedMinutes);
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 60000);
    }
    return () => clearInterval(interval);
  }, [order]);

  const fetchOrder = async (orderNum) => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get(`/orders/track/${orderNum}`);
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
        calculateEstimatedTime(response.data.data);
        setSearched(true);
      } else {
        setError('Order not found');
        setOrder(null);
      }
    } catch (err) {
      console.error('Track order error:', err);
      setError(err.response?.data?.error || 'Order not found');
      setOrder(null);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError('Please enter an order number');
      return;
    }
    await fetchOrder(orderNumber.trim());
  };

  const calculateEstimatedTime = (orderData) => {
    if (orderData.status === 'pending_confirmation') {
      setEstimatedTime(5);
      return;
    }
    
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

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending_confirmation':
        return <Clock className="text-yellow-500" size={32} />;
      case 'pending':
        return <Clock className="text-blue-500" size={32} />;
      case 'preparing':
        return <ChefHat className="text-orange-500" size={32} />;
      case 'ready':
        return <Coffee className="text-green-500" size={32} />;
      case 'completed':
        return <CheckCircle className="text-purple-500" size={32} />;
      case 'cancelled':
        return <AlertCircle className="text-red-500" size={32} />;
      default:
        return <Clock className="text-gray-500" size={32} />;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending_confirmation':
        return 'Waiting for Waiter Confirmation';
      case 'pending':
        return 'Order Received by Kitchen';
      case 'preparing':
        return 'Being Prepared';
      case 'ready':
        return 'Ready for Pickup';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending_confirmation':
        return 'bg-yellow-500';
      case 'pending':
        return 'bg-blue-500';
      case 'preparing':
        return 'bg-orange-500';
      case 'ready':
        return 'bg-green-500';
      case 'completed':
        return 'bg-purple-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStepStatus = (step, currentStatus) => {
    const steps = ['pending_confirmation', 'pending', 'preparing', 'ready', 'completed'];
    const currentIndex = steps.indexOf(currentStatus);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  // Calculate progress percentage
  const getProgressPercent = (status) => {
    switch(status) {
      case 'pending_confirmation': return 10;
      case 'pending': return 25;
      case 'preparing': return 50;
      case 'ready': return 75;
      case 'completed': return 100;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Track Your Order</h1>
          <p className="text-gray-400">Enter your order number to see real-time status</p>
        </div>

        {/* Search Form */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter order number (e.g., QR-12345678)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : <span>Track Order</span>}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Order Details */}
        {searched && order && (
          <div className="space-y-6">
            {/* Order Header Card */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <p className="text-gray-400 text-sm">Order Number</p>
                  <p className="text-2xl font-bold text-white">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Total Amount</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(order.status)}/20 mb-6`}>
                {getStatusIcon(order.status)}
                <span className={`font-semibold ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              {/* Timer */}
              <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Clock className="text-blue-400" size={24} />
                    <div>
                      <p className="text-gray-400 text-sm">Time Elapsed</p>
                      <p className="text-2xl font-bold text-white">{timer} min</p>
                    </div>
                  </div>
                  {estimatedTime > 0 && order.status !== 'completed' && order.status !== 'ready' && order.status !== 'cancelled' && (
                    <div className="flex items-center gap-3">
                      <ChefHat className="text-orange-400" size={24} />
                      <div>
                        <p className="text-gray-400 text-sm">Estimated Remaining</p>
                        <p className="text-2xl font-bold text-orange-400">{estimatedTime} min</p>
                      </div>
                    </div>
                  )}
                  {order.status === 'ready' && (
                    <div className="flex items-center gap-3 animate-pulse">
                      <Coffee className="text-green-400" size={24} />
                      <div>
                        <p className="text-gray-400 text-sm">Status</p>
                        <p className="text-xl font-bold text-green-400">Ready for Pickup!</p>
                      </div>
                    </div>
                  )}
                  {order.status === 'cancelled' && (
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-red-400" size={24} />
                      <div>
                        <p className="text-gray-400 text-sm">Status</p>
                        <p className="text-xl font-bold text-red-400">Order Cancelled</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {order.status !== 'cancelled' && (
                <div className="mb-6">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${getProgressPercent(order.status)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Order Placed</span>
                    <span>Confirmed</span>
                    <span>Preparing</span>
                    <span>Ready</span>
                    <span>Completed</span>
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className="border-t border-gray-700 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={16} className="text-gray-400" />
                    <div>
                      <p className="text-gray-400 text-xs">Customer</p>
                      <p className="text-white font-medium">{order.customer_name || 'Walk-in Customer'}</p>
                    </div>
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <div>
                        <p className="text-gray-400 text-xs">Phone</p>
                        <p className="text-white font-medium">{order.customer_phone}</p>
                      </div>
                    </div>
                  )}
                  {order.table_number && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <div>
                        <p className="text-gray-400 text-xs">Table</p>
                        <p className="text-white font-medium">Table {order.table_number}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <p className="text-gray-400 text-xs">Ordered At</p>
                      <p className="text-white font-medium">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items Card */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ShoppingBag size={20} className="text-blue-400" />
                Order Items
              </h3>
              
              <div className="space-y-3">
                {order.items && order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-700 last:border-0">
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        <span className="text-blue-400">{item.quantity}x</span> {item.product_name}
                      </p>
                    </div>
                    <p className="text-white font-bold">{formatCurrency(item.total_price || item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">{formatCurrency(order.total_amount * 0.87)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400">VAT (15%)</span>
                  <span className="text-white">{formatCurrency(order.total_amount * 0.13)}</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                  <span className="text-white font-bold text-lg">Total</span>
                  <span className="text-green-400 font-bold text-xl">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            {order.notes && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Special Instructions</h3>
                <p className="text-gray-300 italic">"{order.notes}"</p>
              </div>
            )}

            {/* Help Section */}
            <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/30 text-center">
              <p className="text-blue-400 text-sm">
                💡 Need help? Call the restaurant at <strong className="text-white">+251-XXX-XXX-XXX</strong>
              </p>
            </div>
          </div>
        )}

        {/* No Order Found */}
        {searched && !order && !loading && (
          <div className="bg-gray-800 rounded-2xl p-12 text-center border border-gray-700">
            <AlertCircle size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500 text-lg">Order Not Found</p>
            <p className="text-gray-600 text-sm mt-1">Please check your order number and try again</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;s