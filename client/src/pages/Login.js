import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import API from '../api/axios';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    try {
      // Real API call to backend
      const response = await API.post('/auth/login', { 
        email: email.trim(), 
        password: password 
      });
      
      if (response.data.success) {
        onLogin(response.data.user, response.data.token);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 mb-4 shadow-xl">
            <Store className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white">EthioPOS</h1>
          <p className="text-gray-400 mt-2">Restaurant Management System</p>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Logging in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
<div className="mt-6 text-center">
  <p className="text-gray-400 text-sm">
    Don't have an account?{' '}
    <Link to="/signup" className="text-blue-400 hover:text-blue-300">
      Sign Up
    </Link>
  </p>
</div>
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">Demo Accounts:</p>
            <p className="text-gray-400 text-xs mt-1">
              admin@example.com / admin123 (Admin)<br />
              cashier@example.com / cashier123 (Cashier)<br />
              kitchen@example.com / kitchen123 (Kitchen)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;