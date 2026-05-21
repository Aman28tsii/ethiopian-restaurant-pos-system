import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import API from '../../api/axios';
import { Loader2, Users, Utensils, RefreshCw, XCircle, PlusCircle, Coffee, Clock, CheckCircle, Bell, Search, Eye, QrCode } from 'lucide-react';
import socket from '../../socket';
import { useLanguage } from '../../context/LanguageContext';
import { QRCodeCanvas } from 'qrcode.react';

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
  const [myAssignedTables, setMyAssignedTables] = useState([]);
  const [availableTablesList, setAvailableTablesList] = useState([]);

  const intervalRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const categories = useMemo(() => {
    return ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, debouncedSearch]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const pendingConfirmations = useMemo(() => activeOrders.filter(o => o.status === 'pending_confirmation'), [activeOrders]);
  const regularActiveOrders = useMemo(() => activeOrders.filter(o => o.status !== 'pending_confirmation'), [activeOrders]);

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const availableCount = tables.filter(t => t.status === 'available').length;
  const pendingOrdersCount = regularActiveOrders.filter(o => o.status === 'pending').length;
  const pendingConfirmationsCount = pendingConfirmations.length;

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchTerm]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchMyTables = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await API.get('/waiter/my-tables');
      setTables(response.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMyShift = useCallback(async () => {
    try {
      const response = await API.get('/waiter/my-shift');
      setMyShift(response.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await API.get('/products');
      setProducts(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchMyActiveOrders = useCallback(async () => {
    try {
      const response = await API.get('/waiter/my-orders');
      setActiveOrders(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchMyPendingConfirmations = useCallback(async () => {
    try {
      const response = await API.get('/waiter/pending-confirmations');
      if (response.data.data?.length > 0) {
        setActiveOrders(prev => {
          const existingIds = new Set(prev.map(o => o.id));
          const newOrders = response.data.data.filter(o => !existingIds.has(o.id));
          return [...newOrders, ...prev];
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTableActiveOrder = useCallback(async (tableId) => {
    try {
      const response = await API.get(`/orders/table/${tableId}/active-order`);
      return response.data.data;
    } catch (err) {
      return null;
    }
  }, []);

  const fetchMyAssignedTables = useCallback(async () => {
    try {
      const response = await API.get('/waiter/my-tables');
      setMyAssignedTables(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAvailableTables = useCallback(async () => {
    try {
      const response = await API.get('/waiter/available-tables');
      setAvailableTablesList(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const assignTableToSelf = useCallback(async (tableId) => {
    if (myAssignedTables.length >= 5) {
      alert('You can only assign up to 5 tables');
      return;
    }
    try {
      const response = await API.post(`/waiter/assign-table/${tableId}`);
      alert(response.data.message);
      await Promise.all([fetchMyAssignedTables(), fetchAvailableTables(), fetchMyTables()]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign table');
    }
  }, [myAssignedTables.length, fetchMyAssignedTables, fetchAvailableTables, fetchMyTables]);

  const unassignTable = useCallback(async (tableId) => {
    if (!confirm('Remove this table from your assignment?')) return;
    try {
      const response = await API.delete(`/waiter/unassign-table/${tableId}`);
      alert(response.data.message);
      await Promise.all([fetchMyAssignedTables(), fetchAvailableTables(), fetchMyTables()]);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unassign table');
    }
  }, [fetchMyAssignedTables, fetchAvailableTables, fetchMyTables]);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchMyTables(),
        fetchProducts(),
        fetchMyActiveOrders(),
        fetchMyShift(),
        fetchMyPendingConfirmations(),
        fetchMyAssignedTables(),
        fetchAvailableTables()
      ]);
    };
    loadInitialData();

    socket.on('order_status_updated', () => {
      fetchMyActiveOrders();
      fetchMyTables(true);
      fetchMyPendingConfirmations();
      fetchMyAssignedTables();
      fetchAvailableTables();
    });
    socket.on('new_order', () => {
      fetchMyActiveOrders();
      fetchMyPendingConfirmations();
    });
    socket.on('new_pending_order', () => {
      fetchMyPendingConfirmations();
      try {
        new Audio('/notification.mp3').play().catch(() => {});
      } catch(e) {}
    });
    
    return () => {
      socket.off('order_status_updated');
      socket.off('new_order');
      socket.off('new_pending_order');
    };
  }, [fetchMyTables, fetchMyActiveOrders, fetchMyPendingConfirmations, fetchProducts, fetchMyShift, fetchMyAssignedTables, fetchAvailableTables]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchMyTables(true);
      fetchMyActiveOrders();
      fetchMyPendingConfirmations();
      fetchMyAssignedTables();
      fetchAvailableTables();
    }, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchMyTables, fetchMyActiveOrders, fetchMyPendingConfirmations, fetchMyAssignedTables, fetchAvailableTables]);

  const manualRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchMyTables(false),
      fetchMyActiveOrders(),
      fetchMyPendingConfirmations(),
      fetchMyShift(),
      fetchMyAssignedTables(),
      fetchAvailableTables()
    ]).finally(() => setRefreshing(false));
  }, [fetchMyTables, fetchMyActiveOrders, fetchMyPendingConfirmations, fetchMyShift, fetchMyAssignedTables, fetchAvailableTables]);

  const generateQRCode = useCallback((tableNumber) => `${window.location.origin}/qr-menu?table=${tableNumber}`, []);

  const openQRModal = useCallback((table, e) => {
    e.stopPropagation();
    setQrTable(table);
    setShowQRModal(true);
  }, []);

  const copyQRUrl = useCallback(() => {
    if (qrTable) {
      navigator.clipboard.writeText(generateQRCode(qrTable.table_number));
      alert('QR URL copied!');
    }
  }, [qrTable, generateQRCode]);

  const getTableGradient = useCallback((status) => {
    switch(status) {
      case 'available': return 'from-emerald-500 to-emerald-600';
      case 'occupied': return 'from-rose-500 to-rose-600';
      case 'reserved': return 'from-amber-500 to-amber-600';
      case 'cleaning': return 'from-slate-500 to-slate-600';
      default: return 'from-gray-500 to-gray-600';
    }
  }, []);

  const getStatusText = useCallback((status) => {
    switch(status) {
      case 'available': return t('available');
      case 'occupied': return t('occupied');
      case 'reserved': return t('reserved');
      case 'cleaning': return t('cleaning');
      default: return status;
    }
  }, [t]);

  const getStatusIcon = useCallback((status) => {
    const size = isMobile ? 20 : 24;
    switch(status) {
      case 'available': return <Utensils size={size} className="text-white/80" />;
      case 'occupied': return <Users size={size} className="text-white/80" />;
      case 'reserved': return <Clock size={size} className="text-white/80" />;
      case 'cleaning': return <Coffee size={size} className="text-white/80" />;
      default: return <Utensils size={size} className="text-white/80" />;
    }
  }, [isMobile]);

  const openAddItemsModal = useCallback(async (table) => {
    setIsSubmitting(true);
    try {
      const activeOrder = await fetchTableActiveOrder(table.id);
      if (activeOrder) {
        setSelectedTableOrder(activeOrder);
        setShowAddItemsModal(true);
      } else {
        alert(t('noActiveOrder'));
      }
    } catch (err) {
      alert(t('couldNotFetchOrder'));
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchTableActiveOrder, t]);

  const addItemsToExistingOrder = useCallback(async () => {
    if (addItemsCart.length === 0) {
      alert(t('pleaseAddItems'));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await API.post(`/orders/${selectedTableOrder.id}/add-items`, {
        items: addItemsCart.map(item => ({ product_id: item.id, quantity: item.quantity }))
      });
      if (response.data.success) {
        alert(`${t('itemsAdded')} #${selectedTableOrder.order_number}!`);
        setShowAddItemsModal(false);
        setAddItemsCart([]);
        setSelectedTableOrder(null);
        await Promise.all([fetchMyTables(), fetchMyActiveOrders()]);
      }
    } catch (err) {
      alert(err.response?.data?.error || t('failedToAddItems'));
    } finally {
      setIsSubmitting(false);
    }
  }, [addItemsCart, selectedTableOrder, t, fetchMyTables, fetchMyActiveOrders]);

  const handleTableClick = useCallback(async (table) => {
    if (table.status === 'available') {
      setSelectedTable(table);
      setShowOrderModal(true);
    } else if (table.status === 'occupied') {
      openAddItemsModal(table);
    } else if (table.status === 'reserved') {
      alert(`${t('table')} ${table.table_number} ${t('isReserved')}`);
    } else if (table.status === 'cleaning') {
      alert(`${t('table')} ${table.table_number} ${t('isCleaning')}`);
    }
  }, [t, openAddItemsModal]);

  const addToCart = useCallback((product) => {
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: price, quantity: 1, total: price }];
    });
  }, []);

  const updateQuantity = useCallback((productId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === productId);
      if (!item) return prev;
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) return prev.filter(i => i.id !== productId);
      return prev.map(i => i.id === productId ? { ...i, quantity: newQuantity, total: newQuantity * i.price } : i);
    });
  }, []);

  const submitOrder = useCallback(async () => {
    if (cart.length === 0) {
      alert(t('pleaseAddItems'));
      return;
    }
    setIsSubmitting(true);
    try {
      const orderData = {
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
        table_id: selectedTable.id,
        order_type: 'dine_in',
        notes: orderNotes
      };
      const response = await API.post('/waiter/orders', orderData);
      if (response.data.success) {
        alert(`${t('orderSent')} #${response.data.data.order_number}!`);
        setShowOrderModal(false);
        setCart([]);
        setOrderNotes('');
        setSelectedTable(null);
        await Promise.all([fetchMyTables(), fetchMyActiveOrders()]);
      }
    } catch (err) {
      alert(err.response?.data?.error || t('failedToSubmitOrder'));
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, selectedTable, orderNotes, t, fetchMyTables, fetchMyActiveOrders]);

  const confirmOrder = useCallback(async (orderId) => {
    setConfirmingOrderId(orderId);
    try {
      const response = await API.put(`/orders/confirm/${orderId}`);
      if (response.data.success) {
        alert('Order confirmed! Sent to kitchen.');
        await Promise.all([fetchMyActiveOrders(), fetchMyPendingConfirmations(), fetchMyTables()]);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm order');
    } finally {
      setConfirmingOrderId(null);
    }
  }, [fetchMyActiveOrders, fetchMyPendingConfirmations, fetchMyTables]);

  const cancelOrder = useCallback(async (orderId, reason) => {
    try {
      await API.put(`/orders/${orderId}/cancel`, { reason });
      alert(t('orderCancelledSuccess'));
      setShowCancelModal(false);
      setCancelReason('');
      setOrderToCancel(null);
      await Promise.all([fetchMyTables(), fetchMyActiveOrders(), fetchMyPendingConfirmations()]);
    } catch (err) {
      alert(err.response?.data?.error || t('failedToCancelOrder'));
    }
  }, [t, fetchMyTables, fetchMyActiveOrders, fetchMyPendingConfirmations]);

  const openCancelModal = useCallback((order) => {
    setOrderToCancel(order);
    setShowCancelModal(true);
  }, []);

  if (loading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="p-3 md:p-8 space-y-4 md:space-y-6 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t('tableManagement')}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {myShift ? `Today's Shift: ${myShift.shift_start} - ${myShift.shift_end}` : t('manageTables')}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-3">
            <div className="bg-emerald-500/10 rounded-xl px-3 md:px-5 py-2 md:py-3 border border-emerald-500/20">
              <p className="text-emerald-400 text-xs font-semibold">{t('available')}</p>
              <p className="text-xl md:text-2xl font-bold text-white">{availableCount}</p>
            </div>
            <div className="bg-rose-500/10 rounded-xl px-3 md:px-5 py-2 md:py-3 border border-rose-500/20">
              <p className="text-rose-400 text-xs font-semibold">{t('occupied')}</p>
              <p className="text-xl md:text-2xl font-bold text-white">{occupiedCount}</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl px-3 md:px-5 py-2 md:py-3 border border-amber-500/20">
              <p className="text-amber-400 text-xs font-semibold">{t('pending')}</p>
              <p className="text-xl md:text-2xl font-bold text-white">{pendingOrdersCount}</p>
            </div>
            {pendingConfirmationsCount > 0 && (
              <div className="bg-blue-500/10 rounded-xl px-3 md:px-5 py-2 md:py-3 border border-blue-500/20 animate-pulse">
                <p className="text-blue-400 text-xs font-semibold">To Confirm</p>
                <p className="text-xl md:text-2xl font-bold text-white">{pendingConfirmationsCount}</p>
              </div>
            )}
            <button onClick={manualRefresh} disabled={refreshing} className="bg-gray-700/50 rounded-xl px-3 md:px-4 py-2 md:py-3 hover:bg-gray-700">
              <RefreshCw size={isMobile ? 16 : 20} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* SELF ASSIGNMENT PANEL */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 md:px-5 py-3 md:py-4 bg-gray-800/80 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">+</span>
                </div>
                <h3 className="text-white font-semibold">Assign Yourself to Tables</h3>
              </div>
              <button onClick={() => { fetchAvailableTables(); fetchMyAssignedTables(); }} className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600">
                <RefreshCw size={14} className="text-gray-400" />
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1">Pick available tables to serve (max 5 tables)</p>
          </div>

          <div className="p-4 md:p-5">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-green-400" />
                <h4 className="text-white font-semibold text-sm">My Tables ({myAssignedTables.length}/5)</h4>
              </div>
              {myAssignedTables.length === 0 ? (
                <div className="bg-gray-700/30 rounded-lg p-4 text-center border border-dashed border-gray-600">
                  <Users size={24} className="mx-auto text-gray-500 mb-1" />
                  <p className="text-gray-500 text-sm">No tables assigned yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {myAssignedTables.map(table => (
                    <div key={table.id} className="bg-gray-700 rounded-lg p-2 flex justify-between items-center">
                      <span className="text-white font-bold text-sm">Table {table.table_number}</span>
                      {table.status !== 'occupied' && (
                        <button onClick={() => unassignTable(table.id)} className="text-red-400">
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle size={16} className="text-emerald-400" />
                <h4 className="text-white font-semibold text-sm">Available Tables ({availableTablesList.length})</h4>
              </div>
              {availableTablesList.length === 0 ? (
                <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                  <p className="text-gray-500 text-sm">No available tables</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableTablesList.map(table => (
                    <button
                      key={table.id}
                      onClick={() => assignTableToSelf(table.id)}
                      disabled={myAssignedTables.length >= 5}
                      className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 rounded-lg p-2 text-center transition disabled:opacity-50"
                    >
                      <span className="text-white font-bold text-sm">Table {table.table_number}</span>
                      <p className="text-gray-400 text-xs">Cap: {table.capacity}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending Confirmations */}
        {pendingConfirmations.length > 0 && (
          <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 overflow-hidden">
            <div className="px-4 py-3 bg-blue-500/20 border-b border-blue-500/30">
              <div className="flex items-center gap-2">
                <Bell size={isMobile ? 16 : 18} className="text-blue-400 animate-pulse" />
                <h3 className="text-white font-semibold">Pending Confirmations ({pendingConfirmations.length})</h3>
              </div>
            </div>
            <div className="divide-y divide-blue-500/20">
              {pendingConfirmations.map(order => (
                <div key={order.id} className="p-3 hover:bg-blue-500/10">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">#{order.order_number}</p>
                      <p className="text-gray-400 text-sm">Table {order.table_number}</p>
                      <p className="text-emerald-400 font-bold">Br {parseFloat(order.total_amount).toFixed(2)}</p>
                    </div>
                    <button onClick={() => confirmOrder(order.id)} disabled={confirmingOrderId === order.id} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                      {confirmingOrderId === order.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                      Confirm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Orders */}
        {regularActiveOrders.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-800/80 border-b border-gray-700 flex justify-between">
              <div className="flex items-center gap-2">
                <Bell size={isMobile ? 16 : 18} className="text-amber-400" />
                <h3 className="text-white font-semibold">Active Orders ({regularActiveOrders.length})</h3>
              </div>
              <button onClick={() => setShowActiveOrders(!showActiveOrders)} className="text-gray-400 text-sm">
                {showActiveOrders ? 'Hide' : 'Show'}
              </button>
            </div>
            {showActiveOrders && (
              <div className="divide-y divide-gray-700 max-h-80 overflow-y-auto">
                {regularActiveOrders.map(order => (
                  <div key={order.id} className="p-3 hover:bg-gray-700/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-bold">#{order.order_number}</p>
                        <p className="text-gray-400 text-sm">Table {order.table_number}</p>
                        <p className="text-emerald-400 font-bold">Br {parseFloat(order.total_amount).toFixed(2)}</p>
                      </div>
                      <button onClick={() => openCancelModal(order)} className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 md:gap-4 bg-gray-800/30 rounded-xl p-3 border border-gray-700">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-gray-300 text-xs">Available</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500 rounded-full"></div><span className="text-gray-300 text-xs">Occupied</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-full"></div><span className="text-gray-300 text-xs">Reserved</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-500 rounded-full"></div><span className="text-gray-300 text-xs">Cleaning</span></div>
          <div className="flex items-center gap-1"><QrCode size={12} className="text-blue-400" /><span className="text-gray-300 text-xs">QR Code</span></div>
        </div>

        {/* Floor Plan */}
        {tables.length > 0 && (
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Your Assigned Tables</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tables.map(table => (
                <div key={table.id} className="relative">
                  <button onClick={() => handleTableClick(table)} className={`w-full bg-gradient-to-br ${getTableGradient(table.status)} rounded-xl p-3 text-center transition hover:scale-105`}>
                    <div className="mb-2">{getStatusIcon(table.status)}</div>
                    <p className="text-white font-bold">Table {table.table_number}</p>
                    <p className="text-white/70 text-xs">Cap: {table.capacity}</p>
                    <div className="mt-1"><span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">{getStatusText(table.status)}</span></div>
                  </button>
                  <button onClick={(e) => openQRModal(table, e)} className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-1.5 shadow-lg">
                    <QrCode size={14} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR Modal */}
        {showQRModal && qrTable && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl max-w-md w-full">
              <div className="p-5 border-b border-gray-700 flex justify-between">
                <h2 className="text-xl font-bold text-white">QR Code - Table {qrTable.table_number}</h2>
                <button onClick={() => setShowQRModal(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-6 text-center">
                <div className="bg-white rounded-xl p-4 inline-block">
                  <QRCodeCanvas value={generateQRCode(qrTable.table_number)} size={180} level="H" />
                </div>
                <button onClick={copyQRUrl} className="mt-4 w-full py-2 bg-blue-600 text-white rounded-xl">Copy URL</button>
              </div>
            </div>
          </div>
        )}

        {/* Order Modal */}
        {showOrderModal && selectedTable && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-700 flex justify-between">
                <h2 className="text-white font-bold">Order for Table {selectedTable.table_number}</h2>
                <button onClick={() => { setShowOrderModal(false); setCart([]); setSelectedTable(null); }} className="text-gray-400">✕</button>
              </div>
              <div className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-2">
                      {filteredProducts.slice(0, 16).map(product => (
                        <button key={product.id} onClick={() => addToCart(product)} className="bg-gray-700 p-2 rounded-lg text-left hover:bg-gray-600">
                          <p className="text-white text-sm">{product.name}</p>
                          <p className="text-emerald-400 text-xs">Br {parseFloat(product.price).toFixed(2)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-80 bg-gray-700/30 rounded-xl p-3">
                    <h3 className="text-white font-semibold mb-2">Cart</h3>
                    <div className="max-h-96 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.id} className="bg-gray-800 rounded p-2 mb-2">
                          <div className="flex justify-between">
                            <span className="text-white text-sm">{item.name} x{item.quantity}</span>
                            <span className="text-white text-sm">Br {item.total.toFixed(2)}</span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => updateQuantity(item.id, -1)} className="text-white bg-gray-700 px-2 rounded">-</button>
                            <button onClick={() => updateQuantity(item.id, 1)} className="text-white bg-gray-700 px-2 rounded">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {cart.length > 0 && (
                      <>
                        <div className="border-t border-gray-600 mt-2 pt-2">
                          <div className="flex justify-between text-white">
                            <span>Total:</span>
                            <span className="text-emerald-400">Br {total.toFixed(2)}</span>
                          </div>
                        </div>
                        <button onClick={submitOrder} className="w-full mt-3 py-2 bg-emerald-600 text-white rounded-lg font-bold">Send to Kitchen</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && orderToCancel && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl max-w-md w-full">
              <div className="p-5">
                <h2 className="text-xl font-bold text-white mb-4">Cancel Order</h2>
                <p className="text-gray-300">Order #{orderToCancel.order_number}</p>
                <textarea className="w-full mt-3 p-2 bg-gray-700 rounded-lg text-white" rows={3} placeholder="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => cancelOrder(orderToCancel.id, cancelReason)} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Yes, Cancel</button>
                  <button onClick={() => { setShowCancelModal(false); setCancelReason(''); setOrderToCancel(null); }} className="flex-1 py-2 bg-gray-700 text-white rounded-lg">No, Keep</button>
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