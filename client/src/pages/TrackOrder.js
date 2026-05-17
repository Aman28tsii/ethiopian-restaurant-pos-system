import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Clock, CheckCircle, Coffee, ChefHat, Truck, Receipt, AlertCircle, RefreshCw, Phone, MapPin, Clock as ClockIcon } from 'lucide-react';

const TrackOrder = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(20); // Default 20 minutes

  // Timer effect - counts up from order creation
  useEffect(() => {
    let interval;
    if (order && order.created_at) {
      const createdTime = new Date(order.created_at).getTime();
      
      interval = setInterval(() => {
        const now = new Date().getTime();
        const elapsedMinutes = Math.floor((now - createdTime) / 60000);
        setTimer(elapsedMinutes);
      }, 60000); // Update every minute
      
      // Initial calculation
      const now = new Date().getTime();
      const elapsedMinutes = Math.floor((now - createdTime) / 60000);
      setTimer(elapsedMinutes);
    }
    return () => clearInterval(interval);
  }, [order]);

  const trackOrder = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await API.get(`/orders/track/${orderNumber}`);
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
        // Estimate remaining time based on status
        calculateEstimatedTime(response.data.data);
      } else {
        setError('Order not found. Please check your order number.');
        setOrder(null);
      }
    } catch (err) {
      console.error('Track order error:', err);
      setError(err.response?.data?.error || 'Order not found');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedTime = (orderData) => {
    // Estimate based on order status and items
    const baseTime = 15; // Base 15 minutes
    const itemCount = orderData.items?.length || 1;
    const additionalTime = Math.min(itemCount * 3, 15); // 3 min per item, max 15
    let totalTime = baseTime + additionalTime;
    
    // Adjust based on status
    if (orderData.status === 'preparing') {
      totalTime = Math.max(5, totalTime - 5);
    } else if (orderData.status === 'ready') {
      totalTime = 0;
    } else if (orderData.status === 'completed') {
      totalTime = 0;
    }
    
    setEstimatedTime(totalTime);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending':
        return <Clock className="text-yellow-500" size={32} />;
      case 'preparing':
        return <ChefHat className="text-blue-500" size={32} />;
      case 'ready':
        return <CheckCircle className="text-green-500" size={32} />;
      case 'completed':
        return <Truck className="text-purple-500" size={32} />;
      default:
        return <Clock className="text-gray-500" size={32} />;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending':
        return 'Order Received';
      case 'preparing':
        return 'Being Prepared';
      case 'ready':
        return 'Ready for Pickup';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'preparing':
        return 'bg-blue-500';
      case 'ready':
        return 'bg-green-500';
      case 'completed':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
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
          <form onSubmit={trackOrder} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter order number (e.g., ORD-12345678)"
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
        {order && (
          <div className="space-y-6">
            {/* Order Header */}
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

              {/* Timer */}
              <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="text-blue-400" size={24} />
                    <div>
                      <p className="text-gray-400 text-sm">Time Elapsed</p>
                      <p className="text-2xl font-bold text-white">{timer} min</p>
                    </div>
                  </div>
                  {estimatedTime > 0 && order.status !== 'completed' && order.status !== 'ready' && (
                    <div className="flex items-center gap-3">
                      <ChefHat className="text-orange-400" size={24} />
                      <div>
                        <p className="text-gray-400 text-sm">Estimated Remaining</p>
                        <p className="text-2xl font-bold text-orange-400">{estimatedTime} min</p>
                      </div>
                    </div>
                  )}
                  {order.status === 'ready' && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-400" size={24} />
                      <div>
                        <p className="text-gray-400 text-sm">Status</p>
                        <p className="text-xl font-bold text-green-400">Ready for Pickup!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Timeline */}
              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-4">Order Progress</p>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute top-5 left-0 right-0 h-1 bg-gray-700 rounded-full">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${
                          order.status === 'pending' ? '25%' :
                          order.status === 'preparing' ? '50%' :
                          order.status === 'ready' ? '75%' :
                          '100%'
                        }` 
                      }}
                    />
                  </div>
                  
                  {/* Timeline steps */}
                  <div className="relative flex justify-between">
                    <div className="text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 z-10 relative ${
                        getStepStatus('pending', order.status) === 'completed' ? 'bg-green-500' :
                        getStepStatus('pending', order.status) === 'current' ? 'bg-blue-500 animate-pulse' :
                        'bg-gray-700'
                      }`}>
                        <CheckCircle size={16} className="text-white" />
                      </div>
                      <p className="text-xs text-gray-400">Order Placed</p>
                      <p className="text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleTimeString() : '-'}</p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 z-10 relative ${
                        getStepStatus('preparing', order.status) === 'completed' ? 'bg-green-500' :
                        getStepStatus('preparing', order.status) === 'current' ? 'bg-blue-500 animate-pulse' :
                        'bg-gray-700'
                      }`}>
                        <ChefHat size={16} className="text-white" />
                      </div>
                      <p className="text-xs text-gray-400">Preparing</p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 z-10 relative ${
                        getStepStatus('ready', order.status) === 'completed' ? 'bg-green-500' :
                        getStepStatus('ready', order.status) === 'current' ? 'bg-blue-500 animate-pulse' :
                        'bg-gray-700'
                      }`}>
                        <Coffee size={16} className="text-white" />
                      </div>
                      <p className="text-xs text-gray-400">Ready</p>
                    </div>
                    
                    <div className="text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 z-10 relative ${
                        getStepStatus('completed', order.status) === 'completed' ? 'bg-green-500' :
                        getStepStatus('completed', order.status) === 'current' ? 'bg-blue-500 animate-pulse' :
                        'bg-gray-700'
                      }`}>
                        <Truck size={16} className="text-white" />
                      </div>
                      <p className="text-xs text-gray-400">Completed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t border-gray-700 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Customer Name</p>
                    <p className="text-white font-medium">{order.customer_name || 'Walk-in Customer'}</p>
                  </div>
                  {order.customer_phone && (
                    <div>
                      <p className="text-gray-400 text-sm">Phone</p>
                      <p className="text-white font-medium">{order.customer_phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-sm">Table Number</p>
                    <p className="text-white font-medium">{order.table_number || 'Takeaway'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Order Type</p>
                    <p className="text-white font-medium capitalize">{order.order_type || 'Dine In'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Receipt size={20} className="text-blue-400" />
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items && order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        <span className="text-blue-400">{item.quantity}x</span> {item.product_name || item.name}
                      </p>
                      {item.notes && (
                        <p className="text-gray-500 text-xs mt-1">Note: {item.notes}</p>
                      )}
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
                <p className="text-gray-300">{order.notes}</p>
              </div>
            )}

            {/* Help Section */}
            <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/30 text-center">
              <p className="text-blue-400 text-sm">
                💡 Need help? Call us at <strong className="text-white">+251-XXX-XXX-XXX</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;