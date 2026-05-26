import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { Loader2, DollarSign, CreditCard, Smartphone, Printer } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const CashierPOS = () => {
  const { t } = useLanguage();
  const [readyOrders, setReadyOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchReadyOrders();
    const interval = setInterval(fetchReadyOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchReadyOrders = async () => {
    try {
      const response = await API.get('/orders/ready');
      setReadyOrders(response.data.data || []);
    } catch (err) {
      console.error('Fetch ready orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!selectedOrder) return;
    
    setProcessing(true);
    try {
      const response = await API.post(`/orders/${selectedOrder.id}/pay`, {
        payment_method: paymentMethod
      });
      
      if (response.data.success) {
        alert(`${t('paymentSuccessful')} ${selectedOrder.order_number} ${t('completed')}.`);
        setSelectedOrder(null);
        fetchReadyOrders();
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert(err.response?.data?.error || t('paymentFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="h-full flex gap-6">
      {/* Orders List */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-4">{t('readyForPayment')}</h1>
        
        {readyOrders.length === 0 ? (
          <div className="bg-white dark:bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-500 dark:text-gray-400 text-lg">{t('noOrdersReady')}</p>
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">{t('ordersFromKitchenWillAppear')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyOrders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`bg-white dark:bg-white dark:bg-gray-800 rounded-2xl p-6 text-left border-2 transition-all ${
                  selectedOrder?.id === order.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-gray-900 dark:text-gray-900 dark:text-white font-bold text-lg">{order.order_number}</p>
                    <p className="text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{t('table')}: {order.table_number || t('takeaway')}</p>
                  </div>
                  <p className="text-green-600 dark:text-green-400 font-bold text-xl">{formatCurrency(order.total_amount)}</p>
                </div>
                <p className="text-gray-600 dark:text-gray-600 dark:text-gray-300 text-sm">{t('customer')}: {order.customer_name || t('walkInCustomer')}</p>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs mt-2">
                  {t('readySince')}: {new Date(order.created_at).toLocaleTimeString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment Panel */}
      {selectedOrder && (
        <div className="w-96 bg-white dark:bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-gray-700 p-6 flex flex-col shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">{t('payment')}</h2>
            <p className="text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{t('order')}: {selectedOrder.order_number}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-500 dark:text-gray-400">{t('orderTotal')}</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">{formatCurrency(selectedOrder.total_amount)}</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-500 dark:text-gray-400 text-sm mb-3">{t('paymentMethod')}</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'cash' 
                    ? 'bg-green-600 text-gray-900 dark:text-white' 
                    : 'bg-gray-100 dark:bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <DollarSign size={18} />
                {t('cash')}
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'card' 
                    ? 'bg-green-600 text-gray-900 dark:text-white' 
                    : 'bg-gray-100 dark:bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <CreditCard size={18} />
                {t('card')}
              </button>
              <button
                onClick={() => setPaymentMethod('mobile')}
                className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'mobile' 
                    ? 'bg-green-600 text-gray-900 dark:text-white' 
                    : 'bg-gray-100 dark:bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Smartphone size={18} />
                {t('mobile')}
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <button
              onClick={() => setSelectedOrder(null)}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-600 dark:text-gray-300 rounded-xl font-semibold transition"
            >
              {t('cancel')}
            </button>
            <button
              onClick={processPayment}
              disabled={processing}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <Printer size={18} />}
              {t('complete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierPOS;