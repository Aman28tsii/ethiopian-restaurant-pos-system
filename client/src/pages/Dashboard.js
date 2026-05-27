import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  ShoppingCart, AlertTriangle, Calendar, Users,
  Loader2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';

const Dashboard = () => {
  const { t } = useLanguage();
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, chartRes] = await Promise.all([
        API.get('/dashboard'),
        API.get('/dashboard/charts', { params: { period } })
      ]);
      setDashboardData(dashboardRes.data.data);
      setChartData(chartRes.data.data);
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `Br ${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white">{t('dashboard')}</h1>
        <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-1">{t('businessPerformance')}</p>
      </div>

      <div className="flex gap-2 bg-gray-100 dark:bg-white dark:bg-white dark:bg-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setPeriod('week')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${period === 'week' ? 'bg-blue-600 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white'}`}
        >
          {t('last7Days')}
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${period === 'month' ? 'bg-blue-600 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white'}`}
        >
          {t('last30Days')}
        </button>
        <button
          onClick={() => setPeriod('year')}
          className={`px-4 py-2 rounded-lg font-semibold transition ${period === 'year' ? 'bg-blue-600 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-900 dark:text-white'}`}
        >
          {t('last365Days')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-gray-900 dark:text-gray-900 dark:text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-200 text-sm">{t('todayRevenue')}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(dashboardData.today.revenue)}</p>
              <p className="text-blue-200 text-xs mt-2">{dashboardData.today.orders} {t('orders')}</p>
            </div>
            <div className="p-2 bg-blue-500/30 rounded-xl">
              <DollarSign size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-gray-900 dark:text-gray-900 dark:text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-200 text-sm">{t('todayProfit')}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(dashboardData.today.profit)}</p>
              <p className="text-green-200 text-xs mt-2">{t('avgOrder')}: {formatCurrency(dashboardData.today.average_order)}</p>
            </div>
            <div className="p-2 bg-green-500/30 rounded-xl">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-gray-900 dark:text-gray-900 dark:text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-200 text-sm">{t('monthRevenue')}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(dashboardData.month.revenue)}</p>
              <p className="text-purple-200 text-xs mt-2">{dashboardData.month.orders} {t('orders')}</p>
            </div>
            <div className="p-2 bg-purple-500/30 rounded-xl">
              <Calendar size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-6 text-gray-900 dark:text-gray-900 dark:text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-200 text-sm">{t('monthNetProfit')}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(dashboardData.month.net_profit)}</p>
              <p className="text-orange-200 text-xs mt-2">{t('expenses')}: {formatCurrency(dashboardData.month.expenses)}</p>
            </div>
            <div className="p-2 bg-orange-500/30 rounded-xl">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white font-semibold mb-4">{t('revenueProfitTrend')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData?.sales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name={t('revenue')} strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="#10b981" name={t('profit')} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white font-semibold mb-4">{t('dailyOrders')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData?.sales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="orders" fill="#8b5cf6" name={t('orders')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Package size={20} className="text-blue-500 dark:text-blue-400" />
            <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400">{t('totalProducts')}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white">{dashboardData.inventory.total_products}</p>
        </div>
        
        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-yellow-500 dark:text-yellow-400" />
            <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400">{t('lowStock')}</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{dashboardData.inventory.low_stock}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('needReorder')}</p>
        </div>
        
        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-red-500 dark:text-red-400" />
            <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400">{t('outOfStock')}</p>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboardData.inventory.out_of_stock}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('critical')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
            <h3 className="text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white font-semibold">{t('topSellingProducts')}</h3>
            <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{t('last30Days')}</p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {dashboardData.top_products.map((product, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-100 dark:bg-gray-700/50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-700 dark:text-gray-900 dark:text-gray-900 dark:text-white">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white font-medium">{product.name}</p>
                    <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{product.quantity_sold} {t('sold')}</p>
                  </div>
                </div>
                <p className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(product.revenue)}</p>
              </div>
            ))}
            {dashboardData.top_products.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400">{t('noSalesData')}</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
            <h3 className="text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white font-semibold">{t('recentSales')}</h3>
            <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{t('latestTransactions')}</p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {dashboardData.recent_sales.map((sale) => (
              <div key={sale.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-100 dark:bg-gray-700/50 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white font-medium">{sale.sale_number}</p>
                    <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{new Date(sale.created_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{t('cashier')}: {sale.cashier_name || t('system')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(sale.total_amount)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 capitalize mt-1">{t(sale.payment_method) || sale.payment_method}</p>
                  </div>
                </div>
              </div>
            ))}
            {dashboardData.recent_sales.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400">{t('noSalesYet')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{t('weekRevenue')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white">{formatCurrency(dashboardData.week.revenue)}</p>
            </div>
            <div className={`flex items-center gap-1 ${dashboardData.week.revenue > dashboardData.today.revenue * 7 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {dashboardData.week.revenue > dashboardData.today.revenue * 7 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span className="text-sm">{Math.abs(((dashboardData.week.revenue / 7) / dashboardData.today.revenue - 1) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{t('monthProfit')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white">{formatCurrency(dashboardData.month.profit)}</p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-100 dark:bg-gray-700 rounded-lg">
              <TrendingUp size={16} className="text-green-500 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-white dark:bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-200 dark:border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 dark:text-gray-500 dark:text-gray-500 dark:text-gray-400 text-sm">{t('netProfitMargin')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-gray-900 dark:text-white">
                {dashboardData.month.revenue > 0 
                  ? ((dashboardData.month.net_profit / dashboardData.month.revenue) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-100 dark:bg-gray-700 rounded-lg">
              <TrendingUp size={16} className="text-green-500 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;