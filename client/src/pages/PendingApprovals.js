import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Users, CheckCircle, XCircle, Loader2, Clock, RefreshCw, UserCheck, UserX } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PendingApprovals = () => {
  const { t } = useLanguage();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState('staff');

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.get('/auth/users/pending');
      const users = response.data?.data || response.data || [];
      setPendingUsers(users);
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 403) {
        setError(t('accessDeniedOnlyOwnersAndAdmins'));
      } else {
        setError(err.response?.data?.error || t('failedToLoadPendingUsers'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingUsers();
  };

  const approveUser = async (id) => {
    setProcessing(id);
    setError('');
    try {
      await API.put(`/auth/users/${id}/approve`, { role: selectedRole });
      alert(t('userApprovedSuccessfully'));
      fetchPendingUsers();
    } catch (err) {
      console.error('Approve error:', err);
      setError(err.response?.data?.error || t('failedToApproveUser'));
    } finally {
      setProcessing(null);
    }
  };

  const rejectUser = async (id) => {
    if (!window.confirm(t('rejectUserConfirm'))) return;
    
    setProcessing(id);
    setError('');
    try {
      await API.delete(`/auth/users/${id}/reject`);
      alert(t('userRejectedAndRemoved'));
      fetchPendingUsers();
    } catch (err) {
      console.error('Reject error:', err);
      setError(err.response?.data?.error || t('failedToRejectUser'));
    } finally {
      setProcessing(null);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      owner: 'bg-purple-500/20 text-purple-400',
      manager: 'bg-blue-500/20 text-blue-400',
      cashier: 'bg-green-500/20 text-green-400',
      waiter: 'bg-yellow-500/20 text-yellow-400',
      kitchen: 'bg-orange-500/20 text-orange-400',
      staff: 'bg-gray-500/20 text-gray-400'
    };
    return colors[role] || 'bg-gray-500/20 text-gray-400';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('pendingApprovals')}</h1>
          <p className="text-gray-400 mt-1">{t('reviewAndApproveStaffAccounts')}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          {t('refresh')}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Clock size={28} className="text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-semibold">{t('pendingApprovals')}</p>
              <p className="text-2xl font-bold text-white">{pendingUsers.length} {t('usersWaiting')}</p>
            </div>
          </div>
          {pendingUsers.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-gray-300 text-sm">{t('defaultRole')}:</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="staff">{t('staff')}</option>
                <option value="cashier">{t('cashier')}</option>
                <option value="waiter">{t('waiter')}</option>
                <option value="kitchen">{t('kitchen')}</option>
                <option value="manager">{t('manager')}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <UserCheck size={48} className="mx-auto text-green-500 mb-3" />
          <p className="text-gray-500 text-lg">{t('noPendingApprovals')}</p>
          <p className="text-gray-600 text-sm mt-1">{t('allStaffAccountsApproved')}</p>
          <p className="text-gray-600 text-xs mt-2">{t('newStaffWillAppearHere')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingUsers.map(user => (
            <div key={user.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                      <Users size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{user.name}</h3>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-yellow-500/20 rounded-lg">
                    <span className="text-yellow-400 text-xs font-semibold">{t('pending')}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('phone')}:</span>
                    <span className="text-gray-300">{user.phone || t('notProvided')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('requested')}:</span>
                    <span className="text-gray-300 text-xs">{formatDate(user.created_at)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <label className="block text-xs text-gray-400 mb-2">{t('assignRole')}:</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  >
                    <option value="staff">{t('staff')} ({t('basicAccess')})</option>
                    <option value="cashier">{t('cashier')} ({t('paymentOnly')})</option>
                    <option value="waiter">{t('waiter')} ({t('orderTaking')})</option>
                    <option value="kitchen">{t('kitchen')} ({t('foodPrepOnly')})</option>
                    <option value="manager">{t('manager')} ({t('operations')})</option>
                  </select>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => approveUser(user.id)}
                      disabled={processing === user.id}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing === user.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      {t('approve')}
                    </button>
                    <button
                      onClick={() => rejectUser(user.id)}
                      disabled={processing === user.id}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      {t('reject')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      {pendingUsers.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
          <p className="text-blue-400 text-xs text-center">
            💡 {t('tipApprovedUsersWillReceiveEmail')}
          </p>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;