import React, { useState } from 'react';
import { Bell, User, Search } from 'lucide-react';

const Topbar = ({ user }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, message: 'Low stock alert: Coffee beans', type: 'warning', time: '5 mins ago' },
    { id: 2, message: 'New order #1234 completed', type: 'success', time: '10 mins ago' },
    { id: 3, message: 'Daily sales report ready', type: 'info', time: '1 hour ago' },
  ];

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        {/* Page Title */}
        <div>
          <h2 className="text-xl font-semibold text-white">Welcome back, {user?.name?.split(' ')[0] || 'Staff'}!</h2>
          <p className="text-sm text-gray-400">Ready to serve customers</p>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-gray-700 rounded-xl px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none text-white placeholder-gray-400 focus:outline-none px-2 w-64"
            />
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors relative"
            >
              <Bell size={20} className="text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50">
                <div className="p-3 border-b border-gray-700">
                  <h3 className="font-semibold text-white">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map(notif => (
                    <div key={notif.id} className="p-3 border-b border-gray-700 hover:bg-gray-700 transition">
                      <p className="text-sm text-white">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <User size={20} className="text-gray-400" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">{user?.name || 'Staff'}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role || 'cashier'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;