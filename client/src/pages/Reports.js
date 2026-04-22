import React from 'react';
import { BarChart3 } from 'lucide-react';

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports Dashboard</h1>
        <p className="text-gray-400 mt-1">Sales and profit analytics</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <BarChart3 size={64} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Coming in Step 10</h3>
            <p className="text-gray-400">Daily sales, profit reports, and analytics will be here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;