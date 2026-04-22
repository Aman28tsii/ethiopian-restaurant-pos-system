import React, { useState, useEffect, useCallback, useRef } from 'react';
import API from '../api/axios';
import { Award, Loader2, Medal, Crown } from 'lucide-react';

const StaffPerformance = () => {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const intervalRef = useRef(null);
  const isMounted = useRef(true);

  const fetchPerformance = useCallback(async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    try {
      const response = await API.get('/auth/performance', { params: { period } });
      if (isMounted.current) {
        setPerformance(response.data.data);
        setLoading(false);
      }
    } catch (err) {
      console.error('Fetch performance error:', err);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [period]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchPerformance();
    
    // Refresh every 60 seconds only (not constantly)
    intervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchPerformance();
      }
    }, 60000);
    
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPerformance]);

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPeriodText = () => {
    switch(period) {
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'year': return 'Last 365 Days';
      default: return 'Last 30 Days';
    }
  };

  const getTopPerformer = () => {
    if (!performance?.sales_by_staff || performance.sales_by_staff.length === 0) return null;
    return performance.sales_by_staff.reduce((max, item) => 
      parseFloat(item.total_revenue) > parseFloat(max.total_revenue) ? item : max, performance.sales_by_staff[0]);
  };

  const topPerformer = getTopPerformer();

  if (loading && !performance) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!performance) return null;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Award size={20} className="text-yellow-400" />
            Staff Performance
          </h3>
          <p className="text-gray-400 text-sm">{getPeriodText()}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-lg text-sm transition ${period === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded-lg text-sm transition ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
          >
            Month
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-3 py-1 rounded-lg text-sm transition ${period === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Top Performer Highlight */}
      {topPerformer && (
        <div className="m-4 p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <Crown size={28} className="text-yellow-400" />
            <div>
              <p className="text-yellow-400 text-xs font-semibold">🏆 TOP PERFORMER</p>
              <p className="text-white font-bold text-lg">{topPerformer.name}</p>
              <p className="text-gray-400 text-sm">{topPerformer.role} • {formatCurrency(topPerformer.total_revenue)} revenue</p>
            </div>
          </div>
        </div>
      )}

      {/* Sales by Staff Table */}
      {performance.sales_by_staff && performance.sales_by_staff.length > 0 ? (
        <div className="p-4 overflow-x-auto">
          <h4 className="text-white font-medium mb-3">Sales Performance</h4>
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-400">Staff</th>
                <th className="px-4 py-2 text-left text-gray-400">Role</th>
                <th className="px-4 py-2 text-right text-gray-400">Sales</th>
                <th className="px-4 py-2 text-right text-gray-400">Revenue</th>
                <th className="px-4 py-2 text-right text-gray-400">Profit</th>
                <th className="px-4 py-2 text-right text-gray-400">Avg Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {performance.sales_by_staff.slice(0, 5).map((staff, idx) => (
                <tr key={staff.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-white font-medium">
                    {idx === 0 && <Medal size={14} className="inline text-yellow-400 mr-1" />}
                    {staff.name}
                   </td>
                  <td className="px-4 py-3 text-gray-300 capitalize">{staff.role}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{staff.total_sales || 0}</td>
                  <td className="px-4 py-3 text-right text-green-400">{formatCurrency(staff.total_revenue)}</td>
                  <td className="px-4 py-3 text-right text-blue-400">{formatCurrency(staff.total_profit)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(staff.avg_order_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {performance.sales_by_staff.length > 5 && (
            <p className="text-gray-500 text-xs text-center mt-3">
              +{performance.sales_by_staff.length - 5} more staff members
            </p>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <p>No sales data available for this period</p>
        </div>
      )}
    </div>
  );
};

export default StaffPerformance;