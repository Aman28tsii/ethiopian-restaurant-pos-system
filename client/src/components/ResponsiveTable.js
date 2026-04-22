import React from 'react';

const ResponsiveTable = ({ headers, data, renderRow, emptyMessage = "No data available" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-xl">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-[600px] md:min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/50">
              <tr>
                {headers.map((header, idx) => (
                  <th key={idx} className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {data.map((item, idx) => renderRow(item, idx))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;