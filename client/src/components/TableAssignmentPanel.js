import React from 'react';
import { PlusCircle, XCircle, RefreshCw, CheckCircle, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const TableAssignmentPanel = ({ myTables, availableTables, onAssign, onUnassign, onRefresh, loading }) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden mb-6">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-gray-400 text-sm mt-2">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden mb-6">
      {/* Header */}
      <div className="px-4 md:px-5 py-3 md:py-4 bg-gray-800/80 border-b border-gray-700">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">+</span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm md:text-base">
                Assign Yourself to Tables
              </h3>
              <p className="text-gray-400 text-xs">Pick available tables to serve (max 5 tables)</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-5">
        {/* My Tables Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <h4 className="text-white font-semibold text-sm">
                My Tables ({myTables.length}/5)
              </h4>
            </div>
            {myTables.length === 5 && (
              <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                Max reached
              </span>
            )}
          </div>
          
          {myTables.length === 0 ? (
            <div className="bg-gray-700/30 rounded-lg p-4 text-center border border-dashed border-gray-600">
              <Users size={24} className="mx-auto text-gray-500 mb-1" />
              <p className="text-gray-500 text-sm">No tables assigned yet</p>
              <p className="text-gray-600 text-xs">Click on available tables below to assign</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {myTables.map(table => (
                <div
                  key={table.id}
                  className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg p-2 flex items-center justify-between border border-gray-600"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-white font-bold text-sm">Table {table.table_number}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        table.status === 'occupied' 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {table.status}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[10px]">Cap: {table.capacity}</p>
                  </div>
                  {table.status !== 'occupied' && (
                    <button
                      onClick={() => onUnassign(table.id)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                      title="Unassign table"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Tables Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PlusCircle size={16} className="text-emerald-400" />
            <h4 className="text-white font-semibold text-sm">
              Available Tables ({availableTables.length})
            </h4>
          </div>
          
          {availableTables.length === 0 ? (
            <div className="bg-gray-700/30 rounded-lg p-4 text-center">
              <p className="text-gray-500 text-sm">No available tables at the moment</p>
              <p className="text-gray-600 text-xs">All tables are either occupied or already assigned</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {availableTables.map(table => (
                <button
                  key={table.id}
                  onClick={() => onAssign(table.id)}
                  disabled={myTables.length >= 5}
                  className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600 hover:to-teal-600 border border-emerald-500/30 rounded-lg p-2 text-center transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-white font-bold text-base">Table {table.table_number}</span>
                    <span className="text-gray-400 text-xs">Capacity: {table.capacity}</span>
                    <span className="text-emerald-400 text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to assign
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Warning when at limit */}
        {myTables.length >= 5 && availableTables.length > 0 && (
          <div className="mt-4 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <p className="text-yellow-400 text-xs text-center flex items-center justify-center gap-1">
              <span>⚠️</span> You have reached the maximum of 5 tables. Please unassign some tables before taking more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableAssignmentPanel;