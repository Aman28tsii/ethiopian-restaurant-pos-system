import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { 
  RefreshCw, Loader2, CheckCircle, Clock, Sparkles, Bell, 
  Users, Eye, UserCheck, X
} from 'lucide-react';
import socket from '../../socket';

const TableStatus = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [notification, setNotification] = useState('');
  const [selectedWaiter, setSelectedWaiter] = useState('');
  const [waiters, setWaiters] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTableForAssign, setSelectedTableForAssign] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  
  // Get user role from localStorage
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user?.role);
    fetchTables();
    fetchWaiters();
    
    socket.on('table_status_updated', (data) => {
      fetchTables();
      setNotification(`Table ${data.table_number} is now ${data.status}`);
      setTimeout(() => setNotification(''), 3000);
    });
    
    socket.on('order_ready_for_waiter', (data) => {
      setNotification(`🍽️ ${data.message}`);
      setTimeout(() => setNotification(''), 5000);
    });
    
    return () => {
      socket.off('table_status_updated');
      socket.off('order_ready_for_waiter');
    };
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const response = await API.get('/orders/tables/all');
      setTables(response.data.data || []);
    } catch (err) {
      console.error('Fetch tables error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaiters = async () => {
    try {
      const response = await API.get('/orders/waiters');
      setWaiters(response.data.data || []);
    } catch (err) {
      console.error('Fetch waiters error:', err);
      // Don't show error to user, just set empty array
      setWaiters([]);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await API.get(`/orders/${orderId}`);
      setSelectedOrderDetails(response.data.data);
      setShowOrderModal(true);
    } catch (err) {
      console.error('Fetch order details error:', err);
    }
  };

  const updateTableStatus = async (tableId, newStatus) => {
    setUpdating(tableId);
    try {
      await API.put(`/orders/tables/${tableId}/status`, { status: newStatus });
      fetchTables();
    } catch (err) {
      console.error('Update status error:', err);
      alert(err.response?.data?.error || 'Failed to update table status');
    } finally {
      setUpdating(null);
    }
  };

  const assignWaiter = async (tableId, waiterId) => {
    try {
      await API.put(`/orders/tables/${tableId}/assign-waiter`, { waiter_id: waiterId });
      fetchTables();
      setShowAssignModal(false);
      setSelectedTableForAssign(null);
      setSelectedWaiter('');
    } catch (err) {
      console.error('Assign waiter error:', err);
      alert(err.response?.data?.error || 'Failed to assign waiter');
    }
  };

  const getStatusStyle = (status) => {
    const options = {
      available: { value: 'available', label: 'Available', color: 'bg-green-500', textColor: 'text-green-400' },
      occupied: { value: 'occupied', label: 'Occupied', color: 'bg-red-500', textColor: 'text-red-400' },
      reserved: { value: 'reserved', label: 'Reserved', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
      cleaning: { value: 'cleaning', label: 'Cleaning', color: 'bg-blue-500', textColor: 'text-blue-400' }
    };
    return options[status] || options.available;
  };

  const getStatusCount = (statusValue) => {
    return tables.filter(t => t.status === statusValue).length;
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  const isOwner = userRole === 'owner' || userRole === 'admin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  const availableCount = getStatusCount('available');
  const occupiedCount = getStatusCount('occupied');
  const reservedCount = getStatusCount('reserved');
  const cleaningCount = getStatusCount('cleaning');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Table Status Management</h1>
          <p className="text-gray-400 mt-1">Manage table availability, reservations, and cleaning status</p>
        </div>
        <button onClick={fetchTables} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition">
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {notification && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-center animate-pulse">
          <Bell size={18} className="inline mr-2" />
          {notification}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-400" />
            <span className="text-green-400 font-semibold">Available</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{availableCount}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-red-400" />
            <span className="text-red-400 font-semibold">Occupied</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{occupiedCount}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-yellow-400" />
            <span className="text-yellow-400 font-semibold">Reserved</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{reservedCount}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-blue-400" />
            <span className="text-blue-400 font-semibold">Cleaning</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{cleaningCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map(table => {
          const statusStyle = getStatusStyle(table.status);
          return (
            <div key={table.id} className="bg-gray-800 rounded-xl border-2 overflow-hidden transition-all border-gray-700">
              <div className={`p-4 ${statusStyle.color}/10 border-b border-gray-700`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white">Table {table.table_number}</h3>
                    <p className="text-gray-400 text-sm">Capacity: {table.capacity} seats</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full ${statusStyle.color}/20 ${statusStyle.textColor} text-sm font-semibold flex items-center gap-1`}>
                    {statusStyle.label}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {isOwner && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Assigned Waiter</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-500" />
                        <span className="text-white text-sm">
                          {table.waiter_name || 'Not assigned'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTableForAssign(table);
                          setSelectedWaiter(table.waiter_id || '');
                          setShowAssignModal(true);
                        }}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition flex items-center gap-1"
                      >
                        <UserCheck size={12} />
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {table.status === 'occupied' && table.current_order_number && (
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Current Order</p>
                        <p className="text-white text-sm font-mono">{table.current_order_number}</p>
                      </div>
                      <button
                        onClick={() => fetchOrderDetails(table.current_order_id)}
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </div>
                  </div>
                )}

                {table.pending_order_id && (
                  <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/30">
                    <p className="text-yellow-400 text-xs">Pending Order - Awaiting Confirmation</p>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-700">
                  <p className="text-gray-400 text-xs mb-2">Change Status:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateTableStatus(table.id, 'available')}
                      disabled={updating === table.id || table.status === 'available'}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                        table.status === 'available'
                          ? 'bg-green-500 text-white opacity-50 cursor-not-allowed'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white'
                      }`}
                    >
                      {updating === table.id ? <Loader2 className="animate-spin inline" size={12} /> : 'Available'}
                    </button>
                    <button
                      onClick={() => updateTableStatus(table.id, 'occupied')}
                      disabled={updating === table.id || table.status === 'occupied'}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                        table.status === 'occupied'
                          ? 'bg-red-500 text-white opacity-50 cursor-not-allowed'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                      }`}
                    >
                      {updating === table.id ? <Loader2 className="animate-spin inline" size={12} /> : 'Occupied'}
                    </button>
                    <button
                      onClick={() => updateTableStatus(table.id, 'reserved')}
                      disabled={updating === table.id || table.status === 'reserved'}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                        table.status === 'reserved'
                          ? 'bg-yellow-500 text-white opacity-50 cursor-not-allowed'
                          : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-white'
                      }`}
                    >
                      {updating === table.id ? <Loader2 className="animate-spin inline" size={12} /> : 'Reserved'}
                    </button>
                    <button
                      onClick={() => updateTableStatus(table.id, 'cleaning')}
                      disabled={updating === table.id || table.status === 'cleaning'}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition ${
                        table.status === 'cleaning'
                          ? 'bg-blue-500 text-white opacity-50 cursor-not-allowed'
                          : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white'
                      }`}
                    >
                      {updating === table.id ? <Loader2 className="animate-spin inline" size={12} /> : 'Cleaning'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <p className="text-gray-500">No tables found</p>
        </div>
      )}

      {/* Assign Waiter Modal - Only for Owners */}
      {isOwner && showAssignModal && selectedTableForAssign && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Assign Waiter to Table {selectedTableForAssign.table_number}</h2>
              <button onClick={() => { setShowAssignModal(false); setSelectedTableForAssign(null); setSelectedWaiter(''); }} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Waiter</label>
              <select value={selectedWaiter} onChange={(e) => setSelectedWaiter(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4">
                <option value="">-- No Waiter Assigned --</option>
                {waiters.map(waiter => (<option key={waiter.id} value={waiter.id}>{waiter.name} ({waiter.email})</option>))}
              </select>
              <div className="flex gap-3">
                <button onClick={() => assignWaiter(selectedTableForAssign.id, selectedWaiter || null)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">Assign</button>
                <button onClick={() => { setShowAssignModal(false); setSelectedTableForAssign(null); setSelectedWaiter(''); }} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Order Details</h2>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div><p className="text-gray-400 text-xs">Order Number</p><p className="text-white font-bold text-lg">{selectedOrderDetails.order_number}</p></div>
              <div><p className="text-gray-400 text-xs">Customer</p><p className="text-white">{selectedOrderDetails.customer_name || 'Walk-in Customer'}</p></div>
              <div><p className="text-gray-400 text-xs">Status</p><span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">{selectedOrderDetails.status}</span></div>
              <div><p className="text-gray-400 text-xs">Total Amount</p><p className="text-green-400 font-bold">{formatCurrency(selectedOrderDetails.total_amount)}</p></div>
              {selectedOrderDetails.notes && (<div className="bg-yellow-500/10 rounded-lg p-3"><p className="text-yellow-400 text-xs">Special Instructions</p><p className="text-gray-300 text-sm">{selectedOrderDetails.notes}</p></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableStatus;