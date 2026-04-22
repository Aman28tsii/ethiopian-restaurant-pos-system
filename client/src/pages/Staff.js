import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Users, Plus, Edit2, Trash2, Search, X, Loader2, RefreshCw } from 'lucide-react';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    phone: ''
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await API.get('/auth/users');
      console.log('Staff API Response:', response.data);
      // Handle different response structures
      const users = response.data?.data || response.data || [];
      setStaff(users);
      if (users.length === 0) {
        setError('No staff members found');
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 403) {
        setError('Access denied. Only owners and admins can view staff.');
      } else {
        setError(err.response?.data?.error || 'Failed to load staff');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingStaff) {
        // Update existing staff
        await API.put(`/auth/users/${editingStaff.id}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone
        });
        alert('Staff member updated successfully!');
      } else {
        // Create new staff
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        await API.post('/auth/signup', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phone: formData.phone
        });
        alert('Staff member created successfully! They will need admin approval.');
      }
      resetModal();
      fetchStaff();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save staff member');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      try {
        await API.delete(`/auth/users/${id}`);
        alert('Staff member deleted successfully!');
        fetchStaff();
      } catch (err) {
        console.error('Delete error:', err);
        setError(err.response?.data?.error || 'Failed to delete staff member');
      }
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setFormData({ name: '', email: '', password: '', role: 'cashier', phone: '' });
    setError('');
  };

  const getRoleColor = (role) => {
    const colors = {
      owner: 'bg-purple-500/20 text-purple-400',
      admin: 'bg-purple-500/20 text-purple-400',
      manager: 'bg-blue-500/20 text-blue-400',
      cashier: 'bg-green-500/20 text-green-400',
      waiter: 'bg-yellow-500/20 text-yellow-400',
      kitchen: 'bg-orange-500/20 text-orange-400',
      staff: 'bg-gray-500/20 text-gray-400'
    };
    return colors[role?.toLowerCase()] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusBadge = (status, isActive) => {
    if (status === 'pending') {
      return <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">Pending</span>;
    }
    if (isActive === false || status === 'inactive') {
      return <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">Inactive</span>;
    }
    return <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">Active</span>;
  };

  const filteredStaff = staff.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <p className="text-gray-400 mt-1">Manage staff accounts and permissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition"
          >
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Total Staff</p>
          <p className="text-xl font-bold text-white">{staff.length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Active</p>
          <p className="text-xl font-bold text-green-400">{staff.filter(s => s.status === 'active' || s.is_active === true).length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Pending</p>
          <p className="text-xl font-bold text-yellow-400">{staff.filter(s => s.status === 'pending').length}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Roles</p>
          <p className="text-xl font-bold text-blue-400">{new Set(staff.map(s => s.role)).size}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={18} className="text-gray-500 hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Staff Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-gray-400 text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-gray-400 text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-gray-400 text-sm font-semibold">Role</th>
                <th className="px-6 py-3 text-left text-gray-400 text-sm font-semibold">Phone</th>
                <th className="px-6 py-3 text-left text-gray-400 text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-gray-400 text-sm font-semibold">Joined</th>
                <th className="px-6 py-3 text-left text-gray-400 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <Users size={40} className="mx-auto mb-3 text-gray-600" />
                    No staff members found
                    <p className="text-sm text-gray-600 mt-1">Click "Add Staff" to create a new account</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map(member => (
                  <tr key={member.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{member.name}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm">{member.phone || '-'}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(member.status, member.is_active)}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingStaff(member);
                            setFormData({
                              name: member.name,
                              email: member.email,
                              password: '',
                              role: member.role,
                              phone: member.phone || ''
                            });
                            setShowModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 transition"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h2>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-300 transition">
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="owner">Owner (Full Access)</option>
                    <option value="manager">Manager (Operational Access)</option>
                    <option value="cashier">Cashier (Payment Only)</option>
                    <option value="waiter">Waiter (Order Taking)</option>
                    <option value="kitchen">Kitchen (Food Prep Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Optional"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">
                    {editingStaff ? 'Update Staff' : 'Create Staff'}
                  </button>
                  <button type="button" onClick={resetModal} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;