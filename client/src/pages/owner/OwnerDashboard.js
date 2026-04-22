import React, { useState, useEffect, useCallback, memo} from 'react';
import API from '../../api/axios';
import { Loader2, DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';
import { RevenueChart, TopProductsChart, PaymentMethodsChart, HourlySalesChart } from '../../components/Charts';
import LowStockAlert from '../../components/LowStockAlert';
import StaffPerformance from '../../components/StaffPerformance';

const OwnerDashboard = () => {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, chartsRes] = await Promise.all([
        API.get('/dashboard'),
        API.get('/dashboard/charts', { params: { period } })
      ]);
      setData(dashboardRes.data.data);
      setChartData(chartsRes.data.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          <h1 className="text-2xl font-bold text-white">Owner Dashboard</h1>
          <p className="text-gray-400 mt-1">Full business analytics and control</p>
        </div>
        
        <div className="flex gap-2 bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${period === 'week' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${period === 'month' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${period === 'year' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Last 365 Days
          </button>
        </div>
      </div>

      <LowStockAlert />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <DollarSign size={24} className="mb-2" />
          <p className="text-blue-200 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.month?.revenue)}</p>
          <p className="text-blue-200 text-xs mt-2">Last 30 days</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
          <TrendingUp size={24} className="mb-2" />
          <p className="text-green-200 text-sm">Total Profit</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.month?.profit)}</p>
          <p className="text-green-200 text-xs mt-2">Last 30 days</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
          <Users size={24} className="mb-2" />
          <p className="text-purple-200 text-sm">Total Staff</p>
          <p className="text-2xl font-bold">{data?.users?.length || 0}</p>
          <p className="text-purple-200 text-xs mt-2">Active employees</p>
        </div>
        
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white">
          <Calendar size={24} className="mb-2" />
          <p className="text-orange-200 text-sm">Total Orders</p>
          <p className="text-2xl font-bold">{data?.month?.orders || 0}</p>
          <p className="text-orange-200 text-xs mt-2">Last 30 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={chartData?.sales} title="Revenue & Profit Trend" />
        <TopProductsChart data={chartData?.top_products} title="Top Selling Products" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentMethodsChart data={chartData?.payment_methods} title="Payment Methods" />
        <HourlySalesChart data={chartData?.hourly} title="Hourly Sales Trend" />
      </div>

      <StaffPerformance />

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4">Quick Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Avg Order Value</p>
            <p className="text-xl font-bold text-white">{formatCurrency(data?.today?.average_order)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Profit Margin</p>
            <p className="text-xl font-bold text-green-400">{data?.month?.profit_margin || 0}%</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Net Profit</p>
            <p className="text-xl font-bold text-white">{formatCurrency(data?.month?.net_profit)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Expenses</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(data?.month?.expenses)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;