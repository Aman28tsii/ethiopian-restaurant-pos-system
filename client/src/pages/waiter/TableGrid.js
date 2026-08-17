import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import API from '../../api/axios';
import { 
  Loader2, Users, Utensils, RefreshCw, XCircle, PlusCircle, 
  Coffee, Clock, CheckCircle, Bell, Search, Eye, QrCode,
  AlertCircle, UserCheck
} from 'lucide-react';
import socket from '../../socket';
import { useLanguage } from '../../context/LanguageContext';
import { QRCodeCanvas } from 'qrcode.react';
import { formatCurrency, getProductEmoji } from '../../utils/formatting';

const TableGrid = () => {
  const { t } = useLanguage();
  
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [showActiveOrders, setShowActiveOrders] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [selectedTableOrder, setSelectedTableOrder] = useState(null);
  const [addItemsCart, setAddItemsCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrTable, setQrTable] = useState(null);
  const [myShift, setMyShift] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState(null);
  
  const [mySelfTables, setMySelfTables] = useState([]);
  const [availableSelfTables, setAvailableSelfTables] = useState([]);

  const intervalRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  const categories = useMemo(function() {
    return ['all'].concat(products.filter(function(p) { return p.category; }).map(function(p) { return p.category; }));
  }, [products]);

  const filteredProducts = useMemo(function() {
    return products.filter(function(product) {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, debouncedSearch]);

  const subtotal = useMemo(function() { return cart.reduce(function(sum, item) { return sum + item.total; }, 0); }, [cart]);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const pendingConfirmations = useMemo(function() { 
    return activeOrders.filter(function(o) { return o.status === 'pending_confirmation'; }); 
  }, [activeOrders]);
  
  const regularActiveOrders = useMemo(function() { 
    return activeOrders.filter(function(o) { return o.status !== 'pending_confirmation'; }); 
  }, [activeOrders]);

  const occupiedCount = tables.filter(function(t) { return t.status === 'occupied'; }).length;
  const availableCount = tables.filter(function(t) { return t.status === 'available'; }).length;
  const pendingOrdersCount = regularActiveOrders.filter(function(o) { return o.status === 'pending'; }).length;
  const pendingConfirmationsCount = pendingConfirmations.length;

  const showNotification = useCallback(function(message, type) {
    setNotificationMessage({ message: message, type: type || 'info' });
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(function() {
      setNotificationMessage(null);
    }, 5000);
  }, []);

  useEffect(function() {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(function() {
      setDebouncedSearch(searchTerm);
    }, 300);
    return function() {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(function() {
    const checkMobile = function() {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return function() { window.removeEventListener('resize', checkMobile); };
  }, []);

  const fetchMyTables = useCallback(async function(silent) {
    if (!silent) setLoading(true);
    try {
      const response = await API.get('/waiter/my-tables');
      setTables(response.data.data || []);
    } catch (err) {
      console.error('Fetch my tables error:', err);
      showNotification('Failed to fetch tables', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showNotification]);

  const fetchMyShift = useCallback(async function() {
    try {
      const response = await API.get('/waiter/my-shift');
      setMyShift(response.data.data);
    } catch (err) {
      console.error('Fetch my shift error:', err);
    }
  }, []);

  const fetchProducts = useCallback(async function() {
    try {
      const response = await API.get('/products');
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Fetch products error:', err);
      showNotification('Failed to load products', 'error');
    }
  }, [showNotification]);

  const fetchMyActiveOrders = useCallback(async function() {
    try {
      const response = await API.get('/waiter/my-orders');
      setActiveOrders(response.data.data || []);
    } catch (err) {
      console.error('Fetch my active orders error:', err);
    }
  }, []);

  const fetchMyPendingConfirmations = useCallback(async function() {
    try {
      const response = await API.get('/waiter/pending-confirmations');
      if (response.data.data?.length > 0) {
        setActiveOrders(function(prev) {
          const existingIds = new Set(prev.map(function(o) { return o.id; }));
          const newOrders = response.data.data.filter(function(o) { return !existingIds.has(o.id); });
          if (newOrders.length > 0) {
            showNotification(newOrders.length + ' new order(s) awaiting confirmation!', 'info');
          }
          return newOrders.concat(prev);
        });
      }
    } catch (err) {
      console.error('Fetch pending confirmations error:', err);
    }
  }, [showNotification]);

  const fetchTableActiveOrder = useCallback(async function(tableId) {
    try {
      const response = await API.get('/orders/table/' + tableId + '/active-order');
      return response.data.data;
    } catch (err) {
      return null;
    }
  }, []);

  const fetchSelfTables = useCallback(async function() {
    try {
      const response = await API.get('/waiter/my-tables');
      setMySelfTables(response.data.data || []);
    } catch (err) {
      console.error('Fetch self tables error:', err);
    }
  }, []);

  const fetchAvailableSelfTables = useCallback(async function() {
    try {
      const response = await API.get('/waiter/available-tables');
      setAvailableSelfTables(response.data.data || []);
    } catch (err) {
      console.error('Fetch available tables error:', err);
    }
  }, []);

  const assignSelf = useCallback(async function(tableId) {
    if (mySelfTables.length >= 5) {
      alert('You can only assign up to 5 tables');
      return;
    }
    try {
      const response = await API.post('/waiter/assign-table/' + tableId);
      showNotification(response.data.message, 'success');
      await Promise.all([fetchSelfTables(), fetchAvailableSelfTables(), fetchMyTables()]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign table');
    }
  }, [mySelfTables.length, fetchSelfTables, fetchAvailableSelfTables, fetchMyTables, showNotification]);

  const unassignSelf = useCallback(async function(tableId) {
    if (!window.confirm('Remove this table from your assignment?')) return;
    try {
      const response = await API.delete('/waiter/unassign-table/' + tableId);
      showNotification(response.data.message, 'success');
      await Promise.all([fetchSelfTables(), fetchAvailableSelfTables(), fetchMyTables()]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unassign table');
    }
  }, [fetchSelfTables, fetchAvailableSelfTables, fetchMyTables, showNotification]);

  useEffect(function() {
    const loadInitialData = async function() {
      await Promise.all([
        fetchMyTables(),
        fetchProducts(),
        fetchMyActiveOrders(),
        fetchMyShift(),
        fetchMyPendingConfirmations(),
        fetchSelfTables(),
        fetchAvailableSelfTables()
      ]);
    };
    loadInitialData();

    const handleOrderStatusUpdate = function(data) {
      fetchMyActiveOrders();
      fetchMyTables(true);
      fetchMyPendingConfirmations();
      fetchSelfTables();
      fetchAvailableSelfTables();
      if (data.status === 'ready') {
        showNotification('Order #' + data.order_id + ' is now ready!', 'success');
      }
    };
    
    const handleNewOrder = function(data) {
      fetchMyActiveOrders();
      fetchMyPendingConfirmations();
      showNotification('New order received from Table ' + (data.table_id || 'customer') + '!', 'info');
    };
    
    const handleNewPendingOrder = function(data) {
      fetchMyPendingConfirmations();
      showNotification('New QR order from Table ' + (data.table_number || 'customer') + '!', 'info');
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(function() { console.log('Audio not supported'); });
      } catch(e) {}
    };

    socket.on('order_status_updated', handleOrderStatusUpdate);
    socket.on('new_order', handleNewOrder);
    socket.on('new_pending_order', handleNewPendingOrder);
    socket.on('order_ready_for_waiter', function(data) {
      showNotification(data.message, 'success');
      fetchMyActiveOrders();
      fetchMyTables(true);
    });
    
    return function() {
      socket.off('order_status_updated', handleOrderStatusUpdate);
      socket.off('new_order', handleNewOrder);
      socket.off('new_pending_order', handleNewPendingOrder);
      socket.off('order_ready_for_waiter');
    };
  }, [fetchMyTables, fetchMyActiveOrders, fetchMyPendingConfirmations, fetchProducts, fetchMyShift, fetchSelfTables, fetchAvailableSelfTables, showNotification]);

  useEffect(function() {
    intervalRef.current = setInterval(function() {
      fetchMyTables(true);
      fetchMyActiveOrders();
      fetchMyPendingConfirmations();
      fetchSelfTables();
      fetchAvailableSelfTables();
    }, 15000);
    
    return function() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMyTables, fetchMyActiveOrders, fetchMyPendingConfirmations, fetchSelfTables, fetchAvailableSelfTables]);

  const manualRefresh = useCallback(function() {
    setRefreshing(true);
    showNotification('Refreshing data...', 'info');
    Promise.all([
      fetchMyTables(false),
      fetchMyActiveOrders(),
      fetchMyPendingConfirmations(),
      fetchMyShift(),
      fetchSelfTables(),
      fetchAvailableSelfTables()
    ]).finally(function() {
      setRefreshing(false);
      showNotification('Data refreshed!', 'success');
    });
  }, [fetchMyTables, fetchMyActiveOrders, fetchMyPendingConfirmations, fetchMyShift, fetchSelfTables, fetchAvailableSelfTables, showNotification]);

  const generateQRCode = useCallback(function(tableNumber) {
    return window.location.origin + '/qr-menu?table=' + tableNumber;
  }, []);

  const openQRModal = useCallback(function(table, e) {
    e.stopPropagation();
    setQrTable(table);
    setShowQRModal(true);
  }, []);

  const copyQRUrl = useCallback(function() {
    if (qrTable) {
      const qrUrl = generateQRCode(qrTable.table_number);
      navigator.clipboard.writeText(qrUrl);
      showNotification('QR URL copied!', 'success');
    }
  }, [qrTable, generateQRCode, showNotification]);

  const getTableGradient = useCallback(function(status) {
    switch(status) {
      case 'available': return 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700';
      case 'occupied': return 'from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700';
      case 'reserved': return 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700';
      case 'cleaning': return 'from-slate-500 to-slate-600';
      default: return 'from-gray-500 to-gray-600';
    }
  }, []);

  const getStatusText = useCallback(function(status) {
    switch(status) {
      case 'available': return t('available');
      case 'occupied': return t('occupied');
      case 'reserved': return t('reserved');
      case 'cleaning': return t('cleaning');
      default: return status;
    }
  }, [t]);

  const getStatusIcon = useCallback(function(status) {
    const size = isMobile ? 20 : 28;
    switch(status) {
      case 'available': return React.createElement(Utensils, { size: size, className: 'text-white/80' });
      case 'occupied': return React.createElement(Users, { size: size, className: 'text-white/80' });
      case 'reserved': return React.createElement(Clock, { size: size, className: 'text-white/80' });
      case 'cleaning': return React.createElement(Coffee, { size: size, className: 'text-white/80' });
      default: return React.createElement(Utensils, { size: size, className: 'text-white/80' });
    }
  }, [isMobile]);

  const openAddItemsModal = useCallback(async function(table) {
    setIsSubmitting(true);
    try {
      const activeOrder = await fetchTableActiveOrder(table.id);
      if (activeOrder) {
        setSelectedTableOrder(activeOrder);
        setShowAddItemsModal(true);
      } else {
        showNotification(t('noActiveOrder'), 'error');
      }
    } catch (err) {
      console.error('Error fetching active order:', err);
      showNotification(t('couldNotFetchOrder'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchTableActiveOrder, t, showNotification]);

  const addItemsToExistingOrder = useCallback(async function() {
    if (addItemsCart.length === 0) {
      showNotification(t('pleaseAddItems'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await API.post('/orders/' + selectedTableOrder.id + '/add-items', {
        items: addItemsCart.map(function(item) { return { product_id: item.id, quantity: item.quantity }; })
      });

      if (response.data.success) {
        showNotification('Items added to order #' + selectedTableOrder.order_number + '!', 'success');
        setShowAddItemsModal(false);
        setAddItemsCart([]);
        setSelectedTableOrder(null);
        await Promise.all([fetchMyTables(), fetchMyActiveOrders()]);
      }
    } catch (err) {
      console.error('Add items error:', err);
      showNotification(err.response?.data?.error || t('failedToAddItems'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [addItemsCart, selectedTableOrder, t, fetchMyTables, fetchMyActiveOrders, showNotification]);

  const handleTableClick = useCallback(async function(table) {
    if (table.status === 'available') {
      setSelectedTable(table);
      setShowOrderModal(true);
    } else if (table.status === 'occupied') {
      openAddItemsModal(table);
    } else if (table.status === 'reserved') {
      showNotification(t('table') + ' ' + table.table_number + ' is reserved', 'warning');
    } else if (table.status === 'cleaning') {
      showNotification(t('table') + ' ' + table.table_number + ' is being cleaned', 'info');
    }
  }, [t, openAddItemsModal, showNotification]);

  const addToCart = useCallback(function(product) {
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    setCart(function(prevCart) {
      const existing = prevCart.find(function(item) { return item.id === product.id; });
      if (existing) {
        return prevCart.map(function(item) {
          if (item.id === product.id) {
            return { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price };
          }
          return item;
        });
      }
      return prevCart.concat([{
        id: product.id,
        name: product.name,
        price: price,
        quantity: 1,
        total: price
      }]);
    });
  }, []);

  const updateQuantity = useCallback(function(productId, delta) {
    setCart(function(prevCart) {
      const item = prevCart.find(function(i) { return i.id === productId; });
      if (!item) return prevCart;
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prevCart.filter(function(i) { return i.id !== productId; });
      }
      return prevCart.map(function(i) {
        if (i.id === productId) {
          return { ...i, quantity: newQuantity, total: newQuantity * i.price };
        }
        return i;
      });
    });
  }, []);

  const submitOrder = useCallback(async function() {
    if (cart.length === 0) {
      showNotification(t('pleaseAddItems'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        items: cart.map(function(item) { return { product_id: item.id, quantity: item.quantity }; }),
        table_id: selectedTable.id,
        order_type: 'dine_in',
        notes: orderNotes,
        source: 'waiter'
      };

      const response = await API.post('/orders', orderData);
      
      if (response.data.success) {
        showNotification('Order sent to kitchen #' + response.data.data.order_number + '!', 'success');
        setShowOrderModal(false);
        setCart([]);
        setOrderNotes('');
        setSelectedTable(null);
        await Promise.all([fetchMyTables(), fetchMyActiveOrders()]);
      }
    } catch (err) {
      console.error('Submit order error:', err);
      showNotification(err.response?.data?.error || t('failedToSubmitOrder'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, selectedTable, orderNotes, t, fetchMyTables, fetchMyActiveOrders, showNotification]);

  const confirmOrder = useCallback(async function(orderId) {
    setConfirmingOrderId(orderId);
    try {
      const response = await API.put('/orders/confirm/' + orderId);
      if (response.data.success) {
        showNotification('Order confirmed! Sent to kitchen.', 'success');
        await Promise.all([
          fetchMyActiveOrders(),
          fetchMyPendingConfirmations(),
          fetchMyTables()
        ]);
      }
    } catch (err) {
      console.error('Confirm order error:', err);
      showNotification(err.response?.data?.error || 'Failed to confirm order', 'error');
    } finally {
      setConfirmingOrderId(null);
    }
  }, [fetchMyActiveOrders, fetchMyPendingConfirmations, fetchMyTables, showNotification]);

  const cancelOrder = useCallback(async function(orderId, reason) {
    try {
      await API.put('/orders/' + orderId + '/cancel', { reason: reason });
      showNotification(t('orderCancelledSuccess'), 'success');
      setShowCancelModal(false);
      setCancelReason('');
      setOrderToCancel(null);
      await Promise.all([
        fetchMyTables(),
        fetchMyActiveOrders(),
        fetchMyPendingConfirmations()
      ]);
    } catch (err) {
      console.error('Cancel order error:', err);
      showNotification(err.response?.data?.error || t('failedToCancelOrder'), 'error');
    }
  }, [t, fetchMyTables, fetchMyActiveOrders, fetchMyPendingConfirmations, showNotification]);

  const openCancelModal = useCallback(function(order) {
    setOrderToCancel(order);
    setShowCancelModal(true);
  }, []);

  if (loading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="p-3 md:p-8 space-y-4 md:space-y-6 pb-24 md:pb-8">
        
        {notificationMessage && (
          <div className={'rounded-xl p-3 text-center animate-slide-up ' + (notificationMessage.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : notificationMessage.type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-400' : notificationMessage.type === 'warning' ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' : 'bg-blue-500/20 border border-blue-500/30 text-blue-400')}>
            {notificationMessage.message}
          </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t('tableManagement')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {myShift ? 'Today\'s Shift: ' + myShift.shift_start + ' - ' + myShift.shift_end : t('manageTables')}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-3">
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-xl md:rounded-2xl px-3 md:px-5 py-2 md:py-3 border border-emerald-500/20">
              <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">{t('available')}</p>
              <p className="text-xl md:text-2xl font-bold text-white">{availableCount}</p>
            </div>
            <div className="bg-rose-500/10 backdrop-blur-sm rounded-xl md:rounded-2xl px-3 md:px-5 py-2 md:py-3 border border-rose-500/20">
              <p className="text-rose-400 text-xs font-semibold uppercase tracking-wide">{t('occupied')}</p>
              <p className="text-xl md:text-2xl font-bold text-white">{occupiedCount}</p>
            </div>
            <div className="bg-amber-500/10 backdrop-blur-sm rounded-xl md:rounded-2xl px-3 md:px-5 py-2 md:py-3 border border-amber-500/20">
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide">{t('pending')}</p>
              <p className="text-xl md:text-2xl font-bold text-white">{pendingOrdersCount}</p>
            </div>
            {pendingConfirmationsCount > 0 && (
              <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl md:rounded-2xl px-3 md:px-5 py-2 md:py-3 border border-blue-500/20 animate-pulse">
                <p className="text-blue-400 text-xs font-semibold uppercase tracking-wide">To Confirm</p>
                <p className="text-xl md:text-2xl font-bold text-white">{pendingConfirmationsCount}</p>
              </div>
            )}
            <button
              onClick={manualRefresh}
              disabled={refreshing}
              className="bg-gray-100 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 hover:bg-gray-100 dark:bg-gray-700 transition-all duration-200"
            >
              <RefreshCw size={isMobile ? 16 : 20} className={'text-gray-500 dark:text-gray-400 ' + (refreshing ? 'animate-spin' : '')} />
            </button>
          </div>
        </div>

        {/* Self Assignment Panel - Simplified */}
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 md:px-5 py-3 md:py-4 bg-white dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">+</span>
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base">
                    Assign Yourself to Tables
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Pick available tables to serve (max 5 tables)</p>
                </div>
              </div>
              <button
                onClick={function() { fetchAvailableSelfTables(); fetchSelfTables(); }}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={14} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-4 md:p-5">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-400" />
                  <h4 className="text-gray-900 dark:text-white font-semibold text-sm">
                    My Tables ({mySelfTables.length}/5)
                  </h4>
                </div>
                {mySelfTables.length === 5 && (
                  <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                    Max reached
                  </span>
                )}
              </div>
              
              {mySelfTables.length === 0 ? (
                <div className="bg-gray-100 dark:bg-gray-700/30 rounded-lg p-4 text-center border border-dashed border-gray-300 dark:border-gray-600">
                  <Users size={24} className="mx-auto text-gray-500 mb-1" />
                  <p className="text-gray-500 text-sm">No tables assigned yet</p>
                  <p className="text-gray-600 text-xs">Click on available tables below to assign</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {mySelfTables.map(function(table) {
                    return (
                      <div key={table.id} className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg p-2 flex items-center justify-between border border-gray-300 dark:border-gray-600">
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-white font-bold text-sm">Table {table.table_number}</span>
                            <span className={'text-xs px-1.5 py-0.5 rounded-full ' + (table.status === 'occupied' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400')}>
                              {table.status}
                            </span>
                          </div>
                          <p className="text-gray-500 text-[10px]">Cap: {table.capacity}</p>
                        </div>
                        {table.status !== 'occupied' && (
                          <button
                            onClick={function() { unassignSelf(table.id); }}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                            title="Unassign table"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle size={16} className="text-emerald-400" />
                <h4 className="text-gray-900 dark:text-white font-semibold text-sm">
                  Available Tables ({availableSelfTables.length})
                </h4>
              </div>
              
              {availableSelfTables.length === 0 ? (
                <div className="bg-gray-100 dark:bg-gray-700/30 rounded-lg p-4 text-center">
                  <p className="text-gray-500 text-sm">No available tables at the moment</p>
                  <p className="text-gray-600 text-xs">All tables are either occupied or already assigned</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {availableSelfTables.map(function(table) {
                    return (
                      <button
                        key={table.id}
                        onClick={function() { assignSelf(table.id); }}
                        disabled={mySelfTables.length >= 5}
                        className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600 hover:to-teal-600 border border-emerald-500/30 rounded-lg p-2 text-center transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-white font-bold text-base">Table {table.table_number}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Capacity: {table.capacity}</span>
                          <span className="text-emerald-400 text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to assign
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {mySelfTables.length >= 5 && availableSelfTables.length > 0 && (
              <div className="mt-4 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <p className="text-yellow-400 text-xs text-center flex items-center justify-center gap-1">
                  <AlertCircle size={14} />
                  You have reached the maximum of 5 tables. Please unassign some tables before taking more.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Confirmations */}
        {pendingConfirmations.length > 0 && (
          <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl md:rounded-2xl border border-blue-500/30 overflow-hidden">
            <div className="px-4 md:px-5 py-3 md:py-4 bg-blue-500/20 border-b border-blue-500/30">
              <div className="flex items-center gap-2">
                <Bell size={isMobile ? 16 : 18} className="text-blue-400 animate-pulse" />
                <h3 className="text-white font-semibold text-sm md:text-base">
                  Pending Confirmations ({pendingConfirmations.length})
                </h3>
                <span className="text-xs text-blue-400">QR Orders waiting for you</span>
              </div>
            </div>
            <div className="divide-y divide-blue-500/20">
              {pendingConfirmations.map(function(order) {
                return (
                  <div key={order.id} className="p-3 md:p-4 hover:bg-blue-500/10 transition-all duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                          <p className="text-white font-bold text-sm md:text-lg">#{order.order_number}</p>
                          <span className="px-2 py-0.5 md:py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                            Awaiting Confirmation
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">{t('table')} {order.table_number}</span>
                        </div>
                        <p className="text-emerald-400 font-bold text-sm md:text-base mt-1">{formatCurrency(order.total_amount)}</p>
                        {order.customer_name && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Customer: {order.customer_name}</p>
                        )}
                      </div>
                      <button
                        onClick={function() { confirmOrder(order.id); }}
                        disabled={confirmingOrderId === order.id}
                        className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm md:text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {confirmingOrderId === order.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                        Confirm Order
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Orders Panel */}
        {regularActiveOrders.length > 0 && (
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl md:rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 md:px-5 py-3 md:py-4 bg-white dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Bell size={isMobile ? 16 : 18} className="text-amber-400" />
                <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base">
                  {showActiveOrders ? t('activeOrders') : t('activeOrdersHidden')} ({regularActiveOrders.length})
                </h3>
              </div>
              <div className="flex gap-2">
                {!showActiveOrders && regularActiveOrders.length > 0 && (
                  <button
                    onClick={function() { setShowActiveOrders(true); }}
                    className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl text-xs md:text-sm font-semibold transition-all duration-200"
                  >
                    <Eye size={isMobile ? 14 : 16} />
                    <span>{t('showOrders')}</span>
                  </button>
                )}
                {showActiveOrders && regularActiveOrders.length > 0 && (
                  <button
                    onClick={function() { setShowActiveOrders(false); }}
                    className="text-gray-500 dark:text-gray-400 hover:text-white text-xs md:text-sm"
                  >
                    {t('hide')}
                  </button>
                )}
              </div>
            </div>
            
            {showActiveOrders && regularActiveOrders.length > 0 && (
              <div className="divide-y divide-gray-700 max-h-80 overflow-y-auto">
                {regularActiveOrders.map(function(order) {
                  return (
                    <div key={order.id} className="p-3 md:p-4 hover:bg-gray-100 dark:bg-gray-700/30 transition-all duration-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            <p className="text-gray-900 dark:text-white font-bold text-sm md:text-lg">#{order.order_number}</p>
                            <span className={'px-2 py-0.5 md:py-1 rounded-full text-xs font-semibold ' + (order.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400')}>
                              {order.status === 'pending' ? t('pending') : t('preparing')}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">{t('table')} {order.table_number || 'N/A'}</span>
                          </div>
                          <p className="text-emerald-400 font-bold text-sm md:text-base mt-1">{formatCurrency(order.total_amount)}</p>
                          {order.customer_name && (
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Customer: {order.customer_name}</p>
                          )}
                        </div>
                        <button
                          onClick={function() { openCancelModal(order); }}
                          className="w-full sm:w-auto px-3 md:px-4 py-1.5 md:py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <XCircle size={isMobile ? 14 : 16} />
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 md:gap-4 bg-white dark:bg-gray-800/30 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{t('available')}</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-rose-500 to-rose-600 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{t('occupied')}</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{t('reserved')}</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-slate-500 to-slate-600 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">{t('cleaning')}</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300 text-xs md:text-sm flex items-center gap-1">
              <QrCode size={12} /> {t('qrCodeAvailable')}
            </span>
          </div>
        </div>

        {tables.length === 0 && !loading && (
          <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-6 text-center border border-yellow-500/30">
            <Utensils size={48} className="mx-auto text-yellow-400 mb-3" />
            <h3 className="text-yellow-400 font-semibold text-lg">No Tables Assigned</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Use the panel above to assign yourself to tables.
            </p>
          </div>
        )}

        {tables.length > 0 && (
          <div className="bg-white dark:bg-gray-800/30 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center gap-2">
              <div className="w-1 h-5 md:h-6 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-full"></div>
              {t('floorPlan')} - Your Assigned Tables
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {tables.map(function(table) {
                return (
                  <div key={table.id} className="relative">
                    <button
                      onClick={function() { handleTableClick(table); }}
                      className={'relative group bg-gradient-to-br ' + getTableGradient(table.status) + ' rounded-xl md:rounded-2xl p-3 md:p-5 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 w-full'}
                    >
                      {table.status === 'occupied' && (
                        <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-blue-500 rounded-full p-1 md:p-1.5 shadow-lg animate-pulse">
                          <PlusCircle size={isMobile ? 10 : 14} className="text-white" />
                        </div>
                      )}
                      <div className="mb-2 md:mb-3">
                        {getStatusIcon(table.status)}
                      </div>
                      <p className="text-base md:text-xl font-bold text-white">{t('table')} {table.table_number}</p>
                      <p className="text-[10px] md:text-xs text-white/70 mt-1">
                        <Users size={isMobile ? 8 : 12} className="inline mr-0.5 md:mr-1" />
                        {t('capacity')} {table.capacity}
                      </p>
                      <div className="mt-2 md:mt-3">
                        <span className="text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-white/20 text-white whitespace-nowrap">
                          {getStatusText(table.status)}
                        </span>
                      </div>
                      <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-white/0 group-hover:bg-white/5 transition-all duration-300 pointer-events-none" />
                    </button>
                    
                    <button
                      onClick={function(e) { openQRModal(table, e); }}
                      className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 rounded-full p-1.5 md:p-2 shadow-lg transition-all duration-200 hover:scale-110 z-10"
                      title={t('getQRCode')}
                    >
                      <QrCode size={isMobile ? 14 : 18} className="text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && qrTable && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('qrCodeForTable')} {qrTable.table_number}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('customersScanToOrder')}</p>
                </div>
                <button onClick={function() { setShowQRModal(false); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">X</button>
              </div>
              <div className="p-6 text-center">
                <div className="bg-white rounded-xl p-4 mb-4 inline-block mx-auto shadow-lg">
                  <QRCodeCanvas value={generateQRCode(qrTable.table_number)} size={180} level="H" includeMargin={true} className="mx-auto" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{t('qrCodeInstructions')}</p>
                <div className="bg-emerald-500/10 rounded-lg p-2 mb-3">
                  <p className="text-emerald-400 text-sm font-semibold">{t('table')} {qrTable.table_number} - {t('capacity')}: {qrTable.capacity} {t('seats')}</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('qrUrl')}</p>
                  <p className="text-gray-900 dark:text-white text-xs break-all font-mono">{generateQRCode(qrTable.table_number)}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={copyQRUrl} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    {t('copyQrUrl')}
                  </button>
                  <button onClick={function() {
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write('<html><head><title>QR Code - Table ' + qrTable.table_number + '</title><style>body{display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:Arial,sans-serif;margin:0;padding:20px}.qr-container{text-align:center}img{max-width:300px;height:auto}.table-info{margin-top:20px;font-size:18px;color:#333}.url{margin-top:10px;font-size:12px;color:#666;word-break:break-all}</style></head><body><div class="qr-container"><h2>Table ' + qrTable.table_number + ' QR Code</h2><img src="' + canvas.toDataURL() + '" /><div class="table-info"><p>Scan to view menu and order</p><p>Table ' + qrTable.table_number + ' | Capacity: ' + qrTable.capacity + ' seats</p></div><div class="url"><p>' + generateQRCode(qrTable.table_number) + '</p></div></div></body></html>');
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }} className="flex-1 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    {t('print')}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-4">You can generate a physical QR code using any QR code generator website by pasting this URL.</p>
              </div>
            </div>
          </div>
        )}

        {/* NEW ORDER MODAL */}
        {showOrderModal && selectedTable && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col">
              <div className="flex-shrink-0 sticky top-0 bg-white dark:bg-gray-800/95 backdrop-blur-sm p-3 md:p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center z-10">
                <div>
                  <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">{t('newOrderForTable')} {selectedTable.table_number}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-0.5 md:mt-1">{t('capacity')}: {selectedTable.capacity} {t('seats')}</p>
                </div>
                <button
                  onClick={function() {
                    setShowOrderModal(false);
                    setCart([]);
                    setSelectedTable(null);
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white flex items-center justify-center transition-all duration-200"
                >
                  X
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-5">
                <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                  {/* Products Panel */}
                  <div className="flex-1">
                    <div className="mb-4 md:mb-5">
                      <div className="relative mb-2 md:mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={isMobile ? 14 : 18} />
                        <input
                          type="text"
                          placeholder={t('searchMenu')}
                          value={searchTerm}
                          onChange={function(e) { setSearchTerm(e.target.value); }}
                          className="w-full px-3 md:px-4 py-2 md:py-3 pl-9 md:pl-10 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm md:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex gap-1 md:gap-2 overflow-x-auto pb-2">
                        {categories.map(function(cat) {
                          return (
                            <button
                              key={cat}
                              onClick={function() { setSelectedCategory(cat); }}
                              className={'px-2 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200 ' + (selectedCategory === cat ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
                            >
                              {cat === 'all' ? t('allItems') : cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      {filteredProducts.map(function(product) {
                        return (
                          <button
                            key={product.id}
                            onClick={function() { addToCart(product); }}
                            className="bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-100 dark:bg-gray-700 rounded-lg md:rounded-xl p-2 md:p-4 text-left transition-all duration-200 hover:scale-105 hover:shadow-xl group"
                          >
                            <div className="text-2xl md:text-3xl mb-1 md:mb-2">{getProductEmoji(product.category)}</div>
                            <p className="text-gray-900 dark:text-white font-semibold text-xs md:text-sm mb-0.5 md:mb-1 line-clamp-2">{product.name}</p>
                            <p className="text-emerald-400 font-bold text-sm md:text-base">{formatCurrency(product.price)}</p>
                            <div className="mt-1 md:mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] md:text-xs text-emerald-400">{t('addToOrder')}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cart Panel */}
                  <div className="w-full lg:w-96 bg-gray-100 dark:bg-gray-700/30 rounded-xl md:rounded-2xl p-3 md:p-4">
                    <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base flex items-center gap-2 mb-3 md:mb-4">
                      <CheckCircle size={isMobile ? 14 : 18} className="text-emerald-400" />
                      {t('currentOrder')}
                    </h3>

                    <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto space-y-2 md:space-y-3 mb-3 md:mb-4">
                      {cart.length === 0 ? (
                        <div className="text-center py-6 md:py-12">
                          <Utensils size={isMobile ? 32 : 48} className="mx-auto text-gray-600 mb-2 md:mb-3" />
                          <p className="text-gray-500 text-sm md:text-base">{t('cartEmpty')}</p>
                          <p className="text-gray-600 text-xs md:text-sm">{t('tapToAdd')}</p>
                        </div>
                      ) : (
                        cart.map(function(item) {
                          return (
                            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-2 md:p-3">
                              <div className="flex justify-between items-start mb-1 md:mb-2">
                                <div>
                                  <p className="text-gray-900 dark:text-white font-medium text-sm md:text-base">{item.name}</p>
                                  <p className="text-emerald-400 text-xs md:text-sm">{formatCurrency(item.price)}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 md:gap-3">
                                  <button
                                    onClick={function() { updateQuantity(item.id, -1); }}
                                    className="w-6 h-6 md:w-8 md:h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                  >
                                    <span className="text-gray-900 dark:text-white font-bold text-sm md:text-base">-</span>
                                  </button>
                                  <span className="text-gray-900 dark:text-white font-semibold text-base md:text-lg w-6 md:w-8 text-center">{item.quantity}</span>
                                  <button
                                    onClick={function() { updateQuantity(item.id, 1); }}
                                    className="w-6 h-6 md:w-8 md:h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                  >
                                    <span className="text-gray-900 dark:text-white font-bold text-sm md:text-base">+</span>
                                  </button>
                                </div>
                                <span className="text-gray-900 dark:text-white font-bold text-sm md:text-base">{formatCurrency(item.total)}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 md:pt-4">
                      <div className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                        <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                          <span>{t('subtotal')}</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                          <span>{t('vat')}</span>
                          <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex justify-between text-gray-900 dark:text-white font-bold text-base md:text-xl pt-1 md:pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span>{t('total')}</span>
                          <span className="text-emerald-400">{formatCurrency(total)}</span>
                        </div>
                      </div>

                      <textarea
                        placeholder={t('specialInstructions')}
                        value={orderNotes}
                        onChange={function(e) { setOrderNotes(e.target.value); }}
                        className="w-full px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl text-gray-900 dark:text-white text-xs md:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3 md:mb-4"
                        rows={2}
                      />

                      <button
                        onClick={submitOrder}
                        disabled={cart.length === 0 || isSubmitting}
                        className="w-full py-2 md:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg md:rounded-xl font-bold text-sm md:text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <Loader2 className="animate-spin inline mr-2" size={isMobile ? 16 : 20} />
                        ) : (
                          <Utensils className="inline mr-2" size={isMobile ? 16 : 20} />
                        )}
                        {isSubmitting ? t('sending') : t('sendToKitchen')}
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{t('cancelOrder')}</h2>
                  <button
                    onClick={function() {
                      setShowCancelModal(false);
                      setCancelReason('');
                      setOrderToCancel(null);
                    }}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white"
                  >
                    X
                  </button>
                </div>

                <div className="mb-4 md:mb-6">
                  <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">{t('orderNumber')}: #{orderToCancel.order_number}</p>
                  <p className="text-emerald-400 font-bold text-base md:text-lg mt-1">{formatCurrency(orderToCancel.total_amount)}</p>
                </div>

                <div className="mb-4 md:mb-6">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">{t('cancellationReason')}</label>
                  <textarea
                    value={cancelReason}
                    onChange={function(e) { setCancelReason(e.target.value); }}
                    placeholder={t('cancellationPlaceholder')}
                    className="w-full px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={function() { cancelOrder(orderToCancel.id, cancelReason); }}
                    className="flex-1 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-lg md:rounded-xl font-semibold transition-all"
                  >
                    {t('yesCancel')}
                  </button>
                  <button
                    onClick={function() {
                      setShowCancelModal(false);
                      setCancelReason('');
                      setOrderToCancel(null);
                    }}
                    className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg md:rounded-xl font-semibold transition-all"
                  >
                    {t('noKeep')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD ITEMS MODAL */}
        {showAddItemsModal && selectedTableOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col">
              <div className="flex-shrink-0 sticky top-0 bg-white dark:bg-gray-800/95 backdrop-blur-sm p-3 md:p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">{t('addItemsToOrder')} #{selectedTableOrder.order_number}</h2>
                    <p className="text-emerald-400 text-xs md:text-sm mt-0.5 md:mt-1">
                      {t('currentTotal')}: {formatCurrency(selectedTableOrder.total_amount)}
                    </p>
                  </div>
                  <button
                    onClick={function() {
                      setShowAddItemsModal(false);
                      setAddItemsCart([]);
                      setSelectedTableOrder(null);
                    }}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white flex items-center justify-center"
                  >
                    X
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-5">
                <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      {products.map(function(product) {
                        return (
                          <button
                            key={product.id}
                            onClick={function() {
                              const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
                              setAddItemsCart(function(prev) {
                                const existing = prev.find(function(item) { return item.id === product.id; });
                                if (existing) {
                                  return prev.map(function(item) {
                                    if (item.id === product.id) {
                                      return { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price };
                                    }
                                    return item;
                                  });
                                }
                                return prev.concat([{
                                  id: product.id,
                                  name: product.name,
                                  price: price,
                                  quantity: 1,
                                  total: price
                                }]);
                              });
                            }}
                            className="bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-100 dark:bg-gray-700 rounded-lg md:rounded-xl p-2 md:p-4 text-left transition-all duration-200 hover:scale-105"
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-2xl">{getProductEmoji(product.category)}</div>
                              <div>
                                <p className="text-gray-900 dark:text-white font-semibold text-sm md:text-base">{product.name}</p>
                                <p className="text-emerald-400 font-bold text-xs md:text-sm">{formatCurrency(product.price)}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full lg:w-96 bg-gray-100 dark:bg-gray-700/30 rounded-xl md:rounded-2xl p-3 md:p-4">
                    <h3 className="text-gray-900 dark:text-white font-semibold text-sm md:text-base mb-3 md:mb-4">{t('itemsToAdd')}</h3>

                    <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto space-y-2 md:space-y-3 mb-3 md:mb-4">
                      {addItemsCart.length === 0 ? (
                        <div className="text-center py-6 md:py-12">
                          <p className="text-gray-500 text-sm md:text-base">{t('noItemsSelected')}</p>
                        </div>
                      ) : (
                        addItemsCart.map(function(item) {
                          return (
                            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-2 md:p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-gray-900 dark:text-white font-medium text-sm md:text-base">{item.name}</p>
                                  <p className="text-emerald-400 text-xs md:text-sm">{formatCurrency(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3">
                                  <button
                                    onClick={function() {
                                      setAddItemsCart(function(prev) {
                                        const existing = prev.find(function(i) { return i.id === item.id; });
                                        if (existing.quantity === 1) {
                                          return prev.filter(function(i) { return i.id !== item.id; });
                                        }
                                        return prev.map(function(i) {
                                          if (i.id === item.id) {
                                            return { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.price };
                                          }
                                          return i;
                                        });
                                      });
                                    }}
                                    className="w-6 h-6 md:w-8 md:h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
                                  >
                                    -
                                  </button>
                                  <span className="text-gray-900 dark:text-white font-semibold text-sm md:text-base">{item.quantity}</span>
                                  <button
                                    onClick={function() {
                                      setAddItemsCart(function(prev) {
                                        return prev.map(function(i) {
                                          if (i.id === item.id) {
                                            return { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price };
                                          }
                                          return i;
                                        });
                                      });
                                    }}
                                    className="w-6 h-6 md:w-8 md:h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 md:pt-4">
                      <div className="flex justify-between text-gray-900 dark:text-white font-bold text-sm md:text-base mb-3 md:mb-4">
                        <span>{t('subtotal')}</span>
                        <span className="text-emerald-400">{formatCurrency(addItemsCart.reduce(function(sum, i) { return sum + i.total; }, 0))}</span>
                      </div>
                      <button
                        onClick={addItemsToExistingOrder}
                        disabled={addItemsCart.length === 0 || isSubmitting}
                        className="w-full py-2 md:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg md:rounded-xl font-bold text-sm md:text-base transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? t('adding') : t('addToOrder')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableGrid;
