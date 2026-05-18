import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { 
  Plus, Edit2, Trash2, X, Loader2, RefreshCw, 
  Table, QrCode 
} from 'lucide-react';

const ManageTables = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [notification, setNotification] = useState('');
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: 4,
    status: 'available'
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const response = await API.get('/tables');
      setTables(response.data.data || []);
    } catch (err) {
      console.error('Fetch tables error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTable) {
        await API.put(`/tables/${editingTable.id}`, formData);
        setNotification(`Table ${formData.table_number} updated successfully`);
      } else {
        await API.post('/tables', formData);
        setNotification(`Table ${formData.table_number} created successfully`);
      }
      resetModal();
      fetchTables();
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || 'Failed to save table');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (table) => {
    if (window.confirm(`Delete Table ${table.table_number}? This will remove the table from the system.`)) {
      try {
        await API.delete(`/tables/${table.id}`);
        setNotification(`Table ${table.table_number} deleted`);
        fetchTables();
        setTimeout(() => setNotification(''), 3000);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete table');
      }
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingTable(null);
    setFormData({ table_number: '', capacity: 4, status: 'available' });
  };

  const getNextTableNumber = () => {
    if (tables.length === 0) return 1;
    const numbers = tables.map(t => t.table_number);
    for (let i = 1; i <= numbers.length + 1; i++) {
      if (!numbers.includes(i)) return i;
    }
    return tables.length + 1;
  };

  const openCreateModal = () => {
    setFormData({
      table_number: getNextTableNumber(),
      capacity: 4,
      status: 'available'
    });
    setEditingTable(null);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const colors = {
      available: 'bg-green-500/20 text-green-400',
      occupied: 'bg-red-500/20 text-red-400',
      reserved: 'bg-yellow-500/20 text-yellow-400',
      cleaning: 'bg-blue-500/20 text-blue-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const generateQRForTable = (tableNumber) => {
    const qrUrl = `${window.location.origin}/qr-menu?table=${tableNumber}`;
    navigator.clipboard.writeText(qrUrl);
    alert(`QR URL copied!\n\nShare this link: ${qrUrl}\n\nYou can also generate a QR code image using any QR generator.`);
  };

  if (loading && tables.length === 0) {
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
          <h1 className="text-2xl font-bold text-white">Manage Tables</h1>
          <p className="text-gray-400 mt-1">Add, edit, or remove restaurant tables</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchTables} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition">
            <RefreshCw size={18} />
            Refresh
          </button>
          <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition">
            <Plus size={18} />
            Add Table
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-green-400 text-center">
          {notification}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
          <p className="text-gray-400 text-sm">Total Tables</p>
          <p className="text-2xl font-bold text-white">{tables.length}</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/30">
          <p className="text-green-400 text-sm">Available</p>
          <p className="text-2xl font-bold text-green-400">{tables.filter(t => t.status === 'available').length}</p>
        </div>
        <div className="bg-red-500/10 rounded-xl p-4 text-center border border-red-500/30">
          <p className="text-red-400 text-sm">Occupied</p>
          <p className="text-2xl font-bold text-red-400">{tables.filter(t => t.status === 'occupied').length}</p>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-4 text-center border border-yellow-500/30">
          <p className="text-yellow-400 text-sm">Reserved/Cleaning</p>
          <p className="text-2xl font-bold text-yellow-400">{tables.filter(t => t.status === 'reserved' || t.status === 'cleaning').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-all">
            <div className="p-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Table {table.table_number}</h3>
                  <p className="text-gray-400 text-sm">Capacity: {table.capacity} seats</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(table.status)}`}>
                  {table.status}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTable(table);
                    setFormData({
                      table_number: table.table_number,
                      capacity: table.capacity,
                      status: table.status
                    });
                    setShowModal(true);
                  }}
                  className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => generateQRForTable(table.table_number)}
                  className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                >
                  <QrCode size={14} />
                  QR
                </button>
                <button
                  onClick={() => handleDelete(table)}
                  className="flex-1 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <Table size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500">No tables found. Click "Add Table" to create one.</p>
        </div>
      )}

      {/* Add/Edit Table Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h2>
              <button onClick={resetModal} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Table Number *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.table_number}
                  onChange={(e) => setFormData({ ...formData, table_number: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Capacity (seats) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="20"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Initial Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Cleaning</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Note: New tables start as available by default. Occupied is set automatically.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">
                  {editingTable ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetModal} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTables;