import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TrackOrder = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // Get order number from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const order = urlParams.get('order');
    if (order) {
      setOrderNumber(order);
      fetchOrder(order);
    }
  }, []);

  const fetchOrder = async (orderNum) => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://ethiopos-backend.onrender.com/api';
      const response = await axios.get(`${API_URL}/orders/track/${orderNum}`);
      
      if (response.data.success && response.data.data) {
        setOrder(response.data.data);
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

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending_confirmation': '⏳ Waiting for Waiter Confirmation',
      'confirmed': '✅ Confirmed by Waiter',
      'pending': '👨‍🍳 Order Received by Kitchen',
      'preparing': '🔥 Being Prepared',
      'ready': '🍽️ Ready for Pickup',
      'completed': '🎉 Completed - Enjoy!',
      'cancelled': '❌ Cancelled'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'pending_confirmation': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      'confirmed': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      'pending': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      'preparing': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      'ready': 'text-green-400 bg-green-500/10 border-green-500/30',
      'completed': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      'cancelled': 'text-red-400 bg-red-500/10 border-red-500/30'
    };
    return colorMap[status] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };

  const calculateEstimatedTime = (orderData) => {
    if (orderData.status === 'pending_confirmation') return 5;
    if (orderData.status === 'confirmed') return 10;
    if (orderData.status === 'pending') return 15;
    if (orderData.status === 'preparing') return 10;
    if (orderData.status === 'ready') return 0;
    if (orderData.status === 'completed') return 0;
    return 20;
  };

  const calculateElapsedTime = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    return Math.floor((now - created) / 60000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Track Your Order</h1>
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
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
            >
              Track Order
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Order Details */}
        {searched && order && (
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

              {/* Status Badge */}
              <div className={`p-4 rounded-xl mb-6 border ${getStatusColor(order.status)}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    order.status === 'pending_confirmation' ? 'bg-yellow-400' :
                    order.status === 'confirmed' ? 'bg-blue-400' :
                    order.status === 'pending' ? 'bg-indigo-400' :
                    order.status === 'preparing' ? 'bg-orange-400' :
                    order.status === 'ready' ? 'bg-green-400' :
                    order.status === 'completed' ? 'bg-purple-400' :
                    'bg-red-400'
                  }`}></div>
                  <span className="font-semibold">{getStatusText(order.status)}</span>
                </div>
              </div>

              {/* Timer Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">Time Elapsed</p>
                  <p className="text-2xl font-bold text-white">{calculateElapsedTime(order.created_at)} minutes</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">Estimated Remaining</p>
                  <p className="text-2xl font-bold text-orange-400">{calculateEstimatedTime(order.status)} minutes</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${
                        order.status === 'pending_confirmation' ? '10%' :
                        order.status === 'confirmed' ? '25%' :
                        order.status === 'pending' ? '40%' :
                        order.status === 'preparing' ? '60%' :
                        order.status === 'ready' ? '85%' :
                        order.status === 'completed' ? '100%' : '0%'
                      }` 
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Placed</span>
                  <span>Confirmed</span>
                  <span>Kitchen</span>
                  <span>Preparing</span>
                  <span>Ready</span>
                  <span>Done</span>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-white font-semibold mb-3">Order Items</h3>
                <div className="space-y-2">
                  {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-gray-300">
                      <span>{item.quantity}x {item.product_name}</span>
                      <span>{formatCurrency(item.total_price)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.total_amount * 0.87)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm mt-1">
                    <span>VAT (15%)</span>
                    <span>{formatCurrency(order.total_amount * 0.13)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-lg mt-2 pt-2 border-t border-gray-700">
                    <span>Total</span>
                    <span className="text-green-400">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs">Customer Name</p>
                    <p className="text-white">{order.customer_name || 'Walk-in Customer'}</p>
                  </div>
                  {order.customer_phone && (
                    <div>
                      <p className="text-gray-400 text-xs">Phone</p>
                      <p className="text-white">{order.customer_phone}</p>
                    </div>
                  )}
                  {order.table_number && (
                    <div>
                      <p className="text-gray-400 text-xs">Table</p>
                      <p className="text-white">Table {order.table_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-xs">Ordered At</p>
                    <p className="text-white">{formatDate(order.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            {order.notes && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold mb-2">Special Instructions</h3>
                <p className="text-gray-300 italic">"{order.notes}"</p>
              </div>
            )}

            {/* Help Message */}
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
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">Order Not Found</p>
            <p className="text-gray-600 text-sm mt-1">Please check your order number and try again</p>
            <button
              onClick={() => {
                setOrderNumber('');
                setSearched(false);
                setError(null);
              }}
              className="mt-4 text-blue-400 hover:text-blue-300 transition"
            >
              Try another order number
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;