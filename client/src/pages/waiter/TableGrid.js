import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api/axios';
import { Loader2, Users, Utensils, RefreshCw, XCircle, ClipboardList } from 'lucide-react';
import socket from '../../socket';

const TableGrid = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeOrders, setActiveOrders] = useState([]);
  const [showActiveOrders, setShowActiveOrders] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchTables = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await API.get('/tables');
      setTables(response.data.data || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Fetch tables error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await API.get('/products');
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const response = await API.get('/waiter/orders');
      const orders = response.data.data || [];
      setActiveOrders(orders);
    } catch (err) {
      console.error('Fetch active orders error:', err);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchProducts();
    fetchActiveOrders();
    
    socket.on('order_status_updated', (data) => {
      fetchActiveOrders();
      fetchTables(true);
    });
    
    socket.on('new_order', (data) => {
      fetchActiveOrders();
    });
    
    return () => {
      socket.off('order_status_updated');
      socket.off('new_order');
    };
  }, [fetchTables]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTables(true);
      fetchActiveOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const manualRefresh = () => {
    setRefreshing(true);
    fetchTables(false);
    fetchActiveOrders();
  };

  const getTableColor = (status) => {
    switch(status) {
      case 'available': return 'bg-green-600 hover:bg-green-700 active:scale-95';
      case 'occupied': return 'bg-red-600';
      case 'reserved': return 'bg-yellow-600';
      case 'cleaning': return 'bg-gray-600';
      default: return 'bg-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'available': return 'Available';
      case 'occupied': return 'Occupied';
      case 'reserved': return 'Reserved';
      case 'cleaning': return 'Cleaning';
      default: return status;
    }
  };

  const handleTableClick = (table) => {
    if (table.status === 'available') {
      setSelectedTable(table);
      setShowOrderModal(true);
    } else if (table.status === 'occupied') {
      alert(`Table ${table.table_number} is currently occupied`);
    } else if (table.status === 'reserved') {
      alert(`Table ${table.table_number} is reserved`);
    }
  };

  const addToCart = (product) => {
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

  const submitOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to order');
      return;
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        table_id: selectedTable.id,
        order_type: 'dine_in',
        notes: orderNotes
      };

      const response = await API.post('/waiter/orders', orderData);
      
      if (response.data.success) {
        alert(`Order #${response.data.data.order_number} sent to kitchen!`);
        setShowOrderModal(false);
        setCart([]);
        setOrderNotes('');
        setSelectedTable(null);
        await fetchTables();
        await fetchActiveOrders();
      }
    } catch (err) {
      console.error('Submit order error:', err);
      alert(err.response?.data?.error || 'Failed to submit order');
    }
  };

  const cancelOrder = async (orderId, reason) => {
    try {
      await API.put(`/orders/${orderId}/cancel`, { reason });
      alert('Order cancelled successfully! Table is now available.');
      setShowCancelModal(false);
      setCancelReason('');
      setOrderToCancel(null);
      await fetchTables();
      await fetchActiveOrders();
    } catch (err) {
      console.error('Cancel order error:', err);
      alert(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  const openCancelModal = (order) => {
    setOrderToCancel(order);
    setShowCancelModal(true);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  if (loading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const availableCount = tables.filter(t => t.status === 'available').length;
  const pendingOrdersCount = activeOrders.filter(o => o.status === 'pending').length;
  const pendingOrders = activeOrders.filter(o => o.status === 'pending');
  const preparingOrders = activeOrders.filter(o => o.status === 'preparing');

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Table Management</h1>
          <p className="text-sm text-gray-400 mt-1">Select a table to start an order</p>
        </div>
        
        {/* Stats Cards */}
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex gap-2 sm:gap-4 bg-gray-800 rounded-xl px-3 sm:px-4 py-2 flex-1 sm:flex-none justify-between">
            <div className="text-center">
              <p className="text-xs text-gray-400">Available</p>
              <p className="text-lg sm:text-xl font-bold text-green-400">{availableCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Occupied</p>
              <p className="text-lg sm:text-xl font-bold text-red-400">{occupiedCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Pending</p>
              <p className="text-lg sm:text-xl font-bold text-yellow-400">{pendingOrdersCount}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowActiveOrders(!showActiveOrders)}
              className="px-3 sm:px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-sm sm:text-base"
            >
              <ClipboardList size={isMobile ? 16 : 18} />
              <span className="hidden sm:inline ml-2">Orders</span>
            </button>
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 text-right">
        Updated: {lastRefresh.toLocaleTimeString()}
      </p>

      {/* Active Orders Panel */}
      {showActiveOrders && activeOrders.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-gray-700 bg-gray-700/30">
            <h3 className="text-white font-semibold text-sm sm:text-base">Your Active Orders</h3>
          </div>
          
          {pendingOrders.length > 0 && (
            <div className="border-b border-gray-700">
              <div className="px-3 sm:px-4 py-2 bg-yellow-500/10">
                <h4 className="text-yellow-400 font-semibold text-xs sm:text-sm">Pending ({pendingOrders.length})</h4>
              </div>
              {pendingOrders.map(order => (
                <div key={order.id} className="p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-gray-700/30 border-b border-gray-700">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm sm:text-base">Order #{order.order_number}</p>
                    <p className="text-gray-400 text-xs">Table: {order.table_number || 'N/A'}</p>
                    <p className="text-gray-500 text-xs">Total: Br {parseFloat(order.total_amount).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => openCancelModal(order)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                  >
                    <XCircle size={16} className="inline mr-1" />
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}

          {preparingOrders.length > 0 && (
            <div>
              <div className="px-3 sm:px-4 py-2 bg-blue-500/10">
                <h4 className="text-blue-400 font-semibold text-xs sm:text-sm">Preparing ({preparingOrders.length})</h4>
              </div>
              {preparingOrders.map(order => (
                <div key={order.id} className="p-3 sm:p-4 flex justify-between items-center hover:bg-gray-700/30">
                  <div>
                    <p className="text-white font-medium text-sm sm:text-base">Order #{order.order_number}</p>
                    <p className="text-gray-400 text-xs">Table: {order.table_number || 'N/A'}</p>
                  </div>
                  <span className="px-2 sm:px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                    Cooking
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-4 bg-gray-800 rounded-xl p-2 sm:p-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-600 rounded"></div>
          <span className="text-gray-300 text-xs sm:text-sm">Available</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-600 rounded"></div>
          <span className="text-gray-300 text-xs sm:text-sm">Occupied</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-600 rounded"></div>
          <span className="text-gray-300 text-xs sm:text-sm">Reserved</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-600 rounded"></div>
          <span className="text-gray-300 text-xs sm:text-sm">Cleaning</span>
        </div>
      </div>

      {/* Floor Plan - Responsive Grid */}
      <div className="bg-gray-800 rounded-2xl p-3 sm:p-6 border border-gray-700">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Restaurant Floor Plan</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {tables.map(table => (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              disabled={table.status !== 'available'}
              className={`${getTableColor(table.status)} rounded-xl p-3 sm:p-4 md:p-6 text-center transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">
                {table.status === 'available' ? (
                  <Utensils size={isMobile ? 24 : 32} className="mx-auto" />
                ) : (
                  <Users size={isMobile ? 24 : 32} className="mx-auto" />
                )}
              </div>
              <p className="text-base sm:text-2xl font-bold text-white">Table {table.table_number}</p>
              <p className="text-xs sm:text-sm text-white/80 mt-1">Cap: {table.capacity}</p>
              <p className="text-xs mt-2 font-semibold">{getStatusText(table.status)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Order Modal - Mobile Responsive */}
      {showOrderModal && selectedTable && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border border-gray-700 modal-mobile-full">
            <div className="sticky top-0 bg-gray-800 p-4 sm:p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Order for Table {selectedTable.table_number}</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Capacity: {selectedTable.capacity} seats</p>
                </div>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setCart([]);
                    setSelectedTable(null);
                  }}
                  className="text-gray-400 hover:text-gray-300 text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-gray-700"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Products Menu */}
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">Menu</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {products.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="w-full bg-gray-700 hover:bg-gray-600 rounded-xl p-3 text-left transition flex justify-between items-center"
                      >
                        <div>
                          <p className="text-white font-medium text-sm sm:text-base">{product.name}</p>
                          <p className="text-blue-400 text-xs sm:text-sm">Br {parseFloat(product.price).toFixed(2)}</p>
                        </div>
                        <button className="bg-blue-600 text-white rounded-lg p-2 w-8 h-8 flex items-center justify-center">+</button>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Order */}
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">Current Order</h3>
                  <div className="bg-gray-700 rounded-xl p-3 sm:p-4">
                    {cart.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No items added</p>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {cart.map(item => (
                          <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex-1">
                              <p className="text-white text-sm sm:text-base">{item.name}</p>
                              <p className="text-blue-400 text-xs">Br {item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 bg-gray-600 rounded-lg text-white"
                              >
                                -
                              </button>
                              <span className="text-white w-6 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 bg-gray-600 rounded-lg text-white"
                              >
                                +
                              </button>
                              <span className="text-white w-20 text-right text-sm">Br {item.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-gray-600 mt-4 pt-4 space-y-2">
                      <div className="flex justify-between text-gray-400 text-sm">
                        <span>Subtotal</span>
                        <span>Br {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400 text-sm">
                        <span>VAT (15%)</span>
                        <span>Br {tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-bold text-base sm:text-lg pt-2 border-t border-gray-600">
                        <span>Total</span>
                        <span>Br {total.toFixed(2)}</span>
                      </div>
                    </div>

                    <textarea
                      placeholder="Special instructions..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full mt-4 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                      rows={2}
                    />

                    <button
                      onClick={submitOrder}
                      disabled={cart.length === 0}
                      className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base transition disabled:opacity-50"
                    >
                      Send to Kitchen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && orderToCancel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-white">Cancel Order</h2>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setOrderToCancel(null);
                  }}
                  className="text-gray-400 hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-300 text-sm sm:text-base">Order #{orderToCancel.order_number}</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Total: Br {parseFloat(orderToCancel.total_amount).toFixed(2)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Customer changed mind"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => cancelOrder(orderToCancel.id, cancelReason)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
                >
                  Yes, Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setOrderToCancel(null);
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableGrid;