import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { CheckCircle, XCircle, Clock, Users, Utensils, Loader2, Bell, RefreshCw } from 'lucide-react';
import socket from '../../socket';

const PendingConfirmations = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    fetchPendingOrders();
    
    // Listen for new pending orders
    socket.on('new_pending_order', (data) => {
      fetchPendingOrders();
      setNotification(`📱 New order from ${data.customer_name || 'Customer'}`);
      setTimeout(() => setNotification(''), 5000);
      // Play sound
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio not supported'));
    });
    
    return () => {
      socket.off('new_pending_order');
    };
  }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const response = await API.get('/orders/pending-confirmation');
      setPendingOrders(response.data.data || []);
    } catch (err) {
      console.error('Fetch pending orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmOrder = async (orderId) => {
    setProcessing(orderId);
    try {
      const response = await API.put(`/orders/confirm/${orderId}`);
      if (response.data.success) {
        setPendingOrders(prev => prev.filter(o => o.id !== orderId));
        alert(`✅ Order confirmed! Sent to kitchen.`);
      }
    } catch (err) {
      console.error('Confirm order error:', err);
      alert(err.response?.data?.error || 'Failed to confirm order');
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Pending Order Confirmations</h1>
          <p className="text-gray-400 mt-1">Review and confirm customer orders from QR menu</p>
        </div>
        <button
          onClick={fetchPendingOrders}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-center animate-pulse">
          <Bell size={18} className="inline mr-2" />
          {notification}
        </div>
      )}

      {/* Stats */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Clock size={24} className="text-yellow-400" />
          <div>
            <p className="text-yellow-400 font-semibold">Pending Confirmations</p>
            <p className="text-2xl font-bold text-white">{pendingOrders.length} order{pendingOrders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {pendingOrders.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
          <p className="text-gray-500 text-lg">No pending confirmations</p>
          <p className="text-gray-600 text-sm mt-1">Customer orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {pendingOrders.map(order => (
            <div key={order.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-yellow-500/50 transition-all">
              {/* Order Header */}
              <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 p-4 border-b border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <Utensils size={18} className="text-yellow-400" />
                      <span className="text-yellow-400 text-sm font-semibold">QR Order</span>
                    </div>
                    <p className="text-white font-bold text-xl mt-1">{order.order_number}</p>
                    <p className="text-gray-400 text-sm">Table: {order.table_number || 'QR Order'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Total</p>
                    <p className="text-green-400 font-bold text-xl">{formatCurrency(order.total_amount)}</p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-gray-400 text-xs">Customer</p>
                    <p className="text-white font-medium">{order.customer_name || 'Walk-in Customer'}</p>
                  </div>
                  {order.customer_phone && (
                    <div>
                      <p className="text-gray-400 text-xs">Phone</p>
                      <p className="text-white font-medium">{order.customer_phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-xs">Ordered at</p>
                    <p className="text-white font-medium">{new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 border-b border-gray-700">
                <p className="text-gray-400 text-sm mb-2">Items:</p>
                <div className="space-y-1">
                  {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        <span className="text-white font-bold">{item.quantity}x</span> {item.name}
                      </span>
                      <span className="text-gray-400">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {order.notes && (
                <div className="p-4 border-b border-gray-700 bg-yellow-500/5">
                  <p className="text-yellow-400 text-xs mb-1">Special Instructions:</p>
                  <p className="text-gray-300 text-sm italic">"{order.notes}"</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 flex gap-3">
                <button
                  onClick={() => confirmOrder(order.id)}
                  disabled={processing === order.id}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {processing === order.id ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  Confirm Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingConfirmations;