import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, CheckCircle, AlertCircle, Eye, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ActiveOrderSummary = ({ order, onClose, onTrack }) => {
  const { t } = useLanguage();
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (order && order.placed_at) {
      const updateTimer = () => {
        const placed = new Date(order.placed_at).getTime();
        const now = new Date().getTime();
        const minutes = Math.floor((now - placed) / 60000);
        setTimeElapsed(minutes);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [order]);

  if (!order) return null;

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending_confirmation':
        return <Clock className="text-yellow-400" size={20} />;
      case 'confirmed':
        return <CheckCircle className="text-blue-400" size={20} />;
      case 'pending':
        return <Clock className="text-indigo-400" size={20} />;
      case 'preparing':
        return <Clock className="text-orange-400" size={20} />;
      case 'ready':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'completed':
        return <CheckCircle className="text-purple-400" size={20} />;
      default:
        return <AlertCircle className="text-gray-500 dark:text-gray-400" size={20} />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending_confirmation': 'Waiting for Waiter',
      'confirmed': 'Confirmed',
      'pending': 'In Kitchen',
      'preparing': 'Preparing',
      'ready': 'Ready for Pickup',
      'completed': 'Completed'
    };
    return statusMap[status] || status;
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-gray-900 dark:text-white" />
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm">Your Active Order</h3>
        </div>
        <button onClick={onClose} className="text-gray-900 dark:text-white/80 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Order Number */}
        <div className="mb-2">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Order Number</p>
          <p className="text-gray-900 dark:text-white font-mono text-sm font-semibold">{order.order_number}</p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(order.status)}
            <span className="text-gray-600 dark:text-gray-300 text-sm">{getStatusText(order.status)}</span>
          </div>
          <span className="text-gray-500 dark:text-gray-400 text-xs">{timeElapsed} min</span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-700 rounded-full mb-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ 
              width: `${
                order.status === 'pending_confirmation' ? '10%' :
                order.status === 'confirmed' ? '25%' :
                order.status === 'pending' ? '40%' :
                order.status === 'preparing' ? '60%' :
                order.status === 'ready' ? '85%' :
                '100%'
              }` 
            }}
          />
        </div>

        {/* Total */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Total Amount</span>
          <span className="text-green-400 font-bold text-sm">{formatCurrency(order.total_amount)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onTrack}
            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-gray-900 dark:text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1"
          >
            <Eye size={12} />
            Track Order
          </button>
        </div>

        <p className="text-gray-500 text-[10px] text-center mt-2">
          Order saved - you can refresh the page
        </p>
      </div>
    </div>
  );
};

export default ActiveOrderSummary;