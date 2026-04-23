import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Role-based layouts
import OwnerLayout from './layouts/OwnerLayout';
import ManagerLayout from './layouts/ManagerLayout';
import CashierLayout from './layouts/CashierLayout';
import WaiterLayout from './layouts/WaiterLayout';
import KitchenLayout from './layouts/KitchenLayout';

// Role-specific pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import CashierPOS from './pages/cashier/CashierPOS';
import TableGrid from './pages/waiter/TableGrid';
import KitchenDashboard from './pages/kitchen/KitchenDashboard'; // FIXED: Use your existing KitchenDashboard
import Inventory from './pages/Inventory';
import Expenses from './pages/Expenses';
import ProfitReports from './pages/ProfitReports';
import Staff from './pages/Staff';
import PendingApprovals from './pages/PendingApprovals';
import Reports from './pages/Reports';
import Settings from './pages/owner/Settings';

// Role-based route guard
const RoleRoute = ({ children, allowedRoles, userRole, redirectTo = '/login' }) => {
  if (!userRole) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
};

// Get default route based on role
const getDefaultRoute = (role) => {
  switch(role) {
    case 'owner': return '/owner/dashboard';
    case 'manager': return '/manager/dashboard';
    case 'cashier': return '/cashier/pos';
    case 'waiter': return '/waiter/tables';
    case 'kitchen': return '/kitchen/orders';
    default: return '/login';
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      const userData = JSON.parse(savedUser);
      setIsAuthenticated(true);
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  const userRole = user?.role || 'cashier';

  return (
    <Router>
      <Routes>
        {/* Owner Routes */}
        <Route path="/owner/*" element={
          <RoleRoute allowedRoles={['owner', 'admin']} userRole={userRole}>
            <OwnerLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="dashboard" element={<OwnerDashboard />} />
                <Route path="reports" element={<ProfitReports />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="staff" element={<Staff />} />
                <Route path="pending-approvals" element={<PendingApprovals />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/owner/dashboard" />} />
              </Routes>
            </OwnerLayout>
          </RoleRoute>
        } />

        {/* Manager Routes */}
        <Route path="/manager/*" element={
          <RoleRoute allowedRoles={['manager', 'owner', 'admin']} userRole={userRole}>
            <ManagerLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="dashboard" element={<ManagerDashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="reports" element={<Reports />} />
                <Route path="profit" element={<ProfitReports />} />
                <Route path="*" element={<Navigate to="/manager/dashboard" />} />
              </Routes>
            </ManagerLayout>
          </RoleRoute>
        } />

        {/* Cashier Routes */}
        <Route path="/cashier/*" element={
          <RoleRoute allowedRoles={['cashier', 'manager', 'owner', 'admin']} userRole={userRole}>
            <CashierLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="pos" element={<CashierPOS userRole={userRole} />} />
                <Route path="history" element={<div className="text-white p-6">Sales History</div>} />
                <Route path="*" element={<Navigate to="/cashier/pos" />} />
              </Routes>
            </CashierLayout>
          </RoleRoute>
        } />

        {/* Waiter Routes */}
        <Route path="/waiter/*" element={
          <RoleRoute allowedRoles={['waiter', 'cashier', 'manager', 'owner', 'admin']} userRole={userRole}>
            <WaiterLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="tables" element={<TableGrid />} />
                <Route path="orders" element={<div className="text-white p-6">My Orders</div>} />
                <Route path="*" element={<Navigate to="/waiter/tables" />} />
              </Routes>
            </WaiterLayout>
          </RoleRoute>
        } />

        {/* Kitchen Routes - FIXED: Using KitchenDashboard instead of KitchenDisplay */}
        <Route path="/kitchen/*" element={
          <RoleRoute allowedRoles={['kitchen', 'manager', 'owner', 'admin']} userRole={userRole}>
            <KitchenLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="orders" element={<KitchenDashboard />} />
                <Route path="*" element={<Navigate to="/kitchen/orders" />} />
              </Routes>
            </KitchenLayout>
          </RoleRoute>
        } />

        {/* Root redirect based on role */}
        <Route path="/" element={<Navigate to={getDefaultRoute(userRole)} replace />} />
        <Route path="*" element={<Navigate to={getDefaultRoute(userRole)} replace />} />
      </Routes>
    </Router>
  );
}

export default App;