import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { Search, Clock, CheckCircle, Coffee, Loader2, Receipt } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CustomerOrderHistory = () => {
  const { t } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orders, setOrders] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchCustomer = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      alert('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await API.get(`/customers/orders/${phoneNumber}`);
      if (response.data.success) {
        setCustomer(response.data.customer);
        setOrders(response.data.orders);
        setSearched(true);
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('No orders found for this phone number');
      setSearched(true);
      setOrders([]);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  const getStatusBadge = (status) => {
    const statuses = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      preparing: 'bg-blue-500/20 text-blue-400',
      ready: 'bg-green-500/20 text-green-400',
      completed: 'bg-purple-500/20 text-purple-400',
      cancelled: 'bg-red-500/20 text-red-400'
    };
    return statuses[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('orderHistory')}</h1>
          <p className="text-gray-400">{t('enterPhoneToViewOrders')}</p>
        </div>

        {/* Search Form */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-8 border border-gray-700">
          <form onSubmit={searchCustomer} className="flex flex-col sm:flex-row gap-4">
            <input
              type="tel"
              placeholder={t('enterPhoneNumber')}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              {t('viewOrders')}
            </button>
          </form>
        </div>

        {/* Results */}
        {searched && (
          <>
            {customer && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
                <h3 className="text-lg font-semibold mb-2">{t('customerInfo')}</h3>
                <p className="text-2xl font-bold">{customer.name}</p>
                <p className="text-blue-100 mt-1">{customer.phone}</p>
                <div className="flex gap-4 mt-4">
                  <div>
                    <p className="text-blue-200 text-sm">{t('totalOrders')}</p>
                    <p className="text-xl font-bold">{customer.total_orders || 0}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">{t('totalSpent')}</p>
                    <p className="text-xl font-bold">{formatCurrency(customer.total_spent)}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">{t('loyaltyPoints')}</p>
                    <p className="text-xl font-bold">{customer.loyalty_points || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {orders.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center border border-gray-700">
                <Receipt size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">{t('noOrdersFound')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg mb-4">{t('recentOrders')}</h3>
                {orders.map(order => (
                  <div key={order.id} className="bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-gray-600 transition">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                      <div>
                        <p className="text-white font-bold text-lg">#{order.order_number}</p>
                        <p className="text-gray-400 text-sm">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                        <span className="text-green-400 font-bold">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                    
                    {order.items && order.items.length > 0 && (
                      <div className="border-t border-gray-700 pt-3 mt-2">
                        <p className="text-gray-400 text-sm mb-2">{t('items')}:</p>
                        <div className="flex flex-wrap gap-2">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="text-gray-300 text-sm">
                              {item.quantity}x {item.product_name}
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="text-gray-500 text-sm">+{order.items.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerOrderHistory;