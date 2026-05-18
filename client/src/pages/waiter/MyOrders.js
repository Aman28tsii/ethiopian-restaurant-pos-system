import React, { useState, useEffect, useRef } from 'react';
import API from '../../api/axios';
import { Clock, CheckCircle, Coffee, ChefHat, Loader2, RefreshCw, Bell, Utensils, Eye } from 'lucide-react';
import socket from '../../socket';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
    
    // Listen for order status updates
    socket.on('order_status_updated', (data) => {
      fetchOrders();
      if (data.status === 'ready') {
        setNotification(`🍽️ Order #${data.order_id} is ready!`);
        setTimeout(() => setNotification(null), 5000);
      }
    });
    
    // Listen for order ready notifications for this waiter
    socket.on('order_ready_for_waiter', (data) => {
      fetchOrders();
      setNotification(`🍽️ ${data.message}`);
      setTimeout(() => setNotification(null), 5000);
      // Play sound - ignore if file missing
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio not supported'));
      } catch(e) {}
    });
    
    // Listen for new orders
    socket.on('new_order', (data) => {
      fetchOrders();
      setNotification(`📋 New order #${data.order_number} received!`);
      setTimeout(() => setNotification(null), 5000);
    });
    
    return () => {
      socket.off('order_status_updated');
      socket.off('order_ready_for_waiter');
      socket.off('new_order');
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await API.get('/orders/my-orders');
      setOrders(response.data.data || []);
    } catch (err) {
      console.error('Fetch orders error:', err);
      // Show user-friendly error
      if (err.response?.status === 401) {
        setNotification('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setNotification('You don\'t have permission to view orders.');
      } else {
        setNotification('Failed to load orders. Please refresh.');
      }
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  const getStatusBadge = (status) => {
    const statuses = {
      'confirmed': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Confirmed', icon: <CheckCircle size={14} /> },
      'pending': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Kitchen', icon: <Clock size={14} /> },
      'preparing': { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Preparing', icon: <ChefHat size={14} /> },
      'ready': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Ready to Serve!', icon: <Coffee size={14} /> },
      'completed': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Completed', icon: <CheckCircle size={14} /> }
    };
    return statuses[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status, icon: <Clock size={14} /> };
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Active Orders</h1>
          <p className="text-gray-400 mt-1">Orders you have confirmed that are being prepared</p>
        </div>
        <button onClick={fetchOrders} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition">
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {notification && (
        <div className={`rounded-xl p-3 text-center animate-pulse ${
          notification.includes('ready') ? 'bg-green-500/20 border-green-500/30 text-green-400' :
          notification.includes('Failed') ? 'bg-red-500/20 border-red-500/30 text-red-400' :
          'bg-blue-500/20 border-blue-500/30 text-blue-400'
        }`}>
          <Bell size={18} className="inline mr-2" />
          {notification}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
          <p className="text-gray-400 text-xs">Total Active</p>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/30">
          <p className="text-yellow-400 text-xs">In Kitchen</p>
          <p className="text-2xl font-bold text-yellow-400">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="bg-orange-500/10 rounded-xl p-3 text-center border border-orange-500/30">
          <p className="text-orange-400 text-xs">Preparing</p>
          <p className="text-2xl font-bold text-orange-400">{orders.filter(o => o.status === 'preparing').length}</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-3 text-center border border-green-500/30">
          <p className="text-green-400 text-xs">Ready to Serve</p>
          <p className="text-2xl font-bold text-green-400">{orders.filter(o => o.status === 'ready').length}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <Utensils size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500 text-lg">No Active Orders</p>
          <p className="text-gray-600 text-sm mt-1">Orders you confirm will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {orders.map(order => {
            const statusInfo = getStatusBadge(order.status);
            return (
              <div key={order.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-all">
                <div className={`p-4 border-b border-gray-700 ${statusInfo.bg}`}>
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="text-white font-bold text-lg">{order.order_number}</p>
                      <p className="text-gray-400 text-sm">Table: {order.table_number}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-700">
                        {statusInfo.icon}
                        <span className={`text-xs font-semibold ${statusInfo.text}`}>{statusInfo.label}</span>
                      </div>
                      <p className="text-green-400 font-bold mt-1">{formatCurrency(order.total_amount)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-400 text-xs mb-2">Customer: {order.customer_name || 'Walk-in Customer'}</p>
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-2">Items:</p>
                    {order.items && order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{item.quantity}x {item.name}</span>
                        <span className="text-gray-300">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {order.items && order.items.length > 3 && (
                      <p className="text-gray-500 text-xs">+{order.items.length - 3} more items</p>
                    )}
                  </div>
                  {order.notes && (
                    <div className="mt-2 bg-yellow-500/5 rounded-lg p-2">
                      <p className="text-yellow-400 text-xs">Note: {order.notes}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="mt-3 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div><p className="text-gray-400 text-xs">Order Number</p><p className="text-white font-bold">{selectedOrder.order_number}</p></div>
              <div><p className="text-gray-400 text-xs">Customer</p><p className="text-white">{selectedOrder.customer_name || 'Walk-in Customer'}</p></div>
              <div><p className="text-gray-400 text-xs">Table</p><p className="text-white">Table {selectedOrder.table_number}</p></div>
              <div><p className="text-gray-400 text-xs">Status</p><span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">{selectedOrder.status}</span></div>
              <div><p className="text-gray-400 text-xs">Items</p>{selectedOrder.items && selectedOrder.items.map((item, idx) => (<div key={idx} className="flex justify-between text-sm py-1"><span>{item.quantity}x {item.name}</span><span>{formatCurrency(item.price * item.quantity)}</span></div>))}</div>
              <div className="border-t border-gray-700 pt-2"><div className="flex justify-between font-bold"><span>Total</span><span className="text-green-400">{formatCurrency(selectedOrder.total_amount)}</span></div></div>
              {selectedOrder.notes && (<div className="bg-yellow-500/10 rounded-lg p-3"><p className="text-yellow-400 text-xs">Special Instructions</p><p className="text-gray-300">{selectedOrder.notes}</p></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;