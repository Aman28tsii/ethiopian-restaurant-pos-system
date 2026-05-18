import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { Users, UserCheck, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const AssignWaiters = () => {
  const { t } = useLanguage();
  const [tables, setTables] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [selectedWaiters, setSelectedWaiters] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tablesRes, waitersRes] = await Promise.all([
        API.get('/tables'),
        API.get('/orders/waiters')
      ]);
      setTables(tablesRes.data.data || []);
      setWaiters(waitersRes.data.data || []);
      
      // Initialize selected waiters from current assignments
      const initialSelected = {};
      tablesRes.data.data.forEach(table => {
        if (table.waiter_id) {
          initialSelected[table.id] = table.waiter_id;
        }
      });
      setSelectedWaiters(initialSelected);
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const assignWaiter = async (tableId, waiterId) => {
    setSaving(tableId);
    try {
      await API.put(`/orders/tables/${tableId}/assign-waiter`, { waiter_id: waiterId });
      setSelectedWaiters(prev => ({ ...prev, [tableId]: waiterId }));
      // Show success feedback
      const btn = document.getElementById(`table-${tableId}`);
      if (btn) {
        btn.classList.add('bg-green-600');
        setTimeout(() => btn.classList.remove('bg-green-600'), 1000);
      }
    } catch (err) {
      console.error('Assign error:', err);
      alert('Failed to assign waiter');
    } finally {
      setSaving(null);
    }
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
          <h1 className="text-2xl font-bold text-white">Assign Waiters to Tables</h1>
          <p className="text-gray-400 mt-1">Assign waiters to specific tables for order management</p>
        </div>
        <button
          onClick={fetchData}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-blue-400 text-sm">
          💡 When customers scan QR codes at their tables, orders will be sent to the assigned waiter for confirmation.
        </p>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tables.map(table => (
          <div key={table.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-all">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Table {table.table_number}</h3>
                  <p className="text-gray-400 text-sm">Capacity: {table.capacity} seats</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Current Status</p>
                  <p className={`text-sm font-semibold capitalize ${table.status === 'available' ? 'text-green-400' : table.status === 'occupied' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {table.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Assigned Waiter</label>
              <div className="flex gap-3">
                <select
                  value={selectedWaiters[table.id] || ''}
                  onChange={(e) => assignWaiter(table.id, parseInt(e.target.value))}
                  disabled={saving === table.id}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Select Waiter --</option>
                  {waiters.map(waiter => (
                    <option key={waiter.id} value={waiter.id}>
                      {waiter.name} ({waiter.email})
                    </option>
                  ))}
                </select>
                <button
                  id={`table-${table.id}`}
                  onClick={() => {
                    const currentValue = selectedWaiters[table.id];
                    if (currentValue && document.querySelector(`select`).value) {
                      assignWaiter(table.id, parseInt(document.querySelector(`select`).value));
                    }
                  }}
                  disabled={saving === table.id || !selectedWaiters[table.id]}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
                >
                  {saving === table.id ? <Loader2 className="animate-spin" size={18} /> : <UserCheck size={18} />}
                </button>
              </div>
              {selectedWaiters[table.id] && (
                <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Waiter assigned
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-400" />
            <span className="text-gray-300">Assigned Tables:</span>
          </div>
          <span className="text-white font-bold">
            {Object.values(selectedWaiters).filter(w => w).length} / {tables.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AssignWaiters;