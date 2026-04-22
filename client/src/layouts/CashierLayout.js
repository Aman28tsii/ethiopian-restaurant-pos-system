import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const CashierLayout = ({ children, user, onLogout }) => {
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CashierLayout;