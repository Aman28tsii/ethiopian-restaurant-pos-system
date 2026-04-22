import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { 
  Receipt, Plus, Edit2, Trash2, Search, X, 
  Calendar, DollarSign, TrendingUp, TrendingDown,
  PieChart, Download, Loader2
} from 'lucide-react';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const expenseCategories = [
    'Rent', 'Utilities', 'Salaries', 'Marketing', 
    'Maintenance', 'Supplies', 'Transport', 'Insurance', 
    'Taxes', 'Other'
  ];

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesRes, summaryRes, categoriesRes] = await Promise.all([
        API.get('/expenses', { params: dateRange }),
        API.get('/expenses/summary', { params: dateRange }),
        API.get('/expenses/categories')
      ]);
      setExpenses(expensesRes.data.data || []);
      setSummary(summaryRes.data.data);
      setCategories(categoriesRes.data.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await API.put(`/expenses/${editingExpense.id}`, formData);
      } else {
        await API.post('/expenses', formData);
      }
      resetModal();
      fetchData();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || 'Failed to save expense');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await API.delete(`/expenses/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete');
      }
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData({
      category: '',
      amount: '',
      description: '',
      expense_date: new Date().toISOString().split('T')[0]
    });
  };

  const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredExpenses = expenses.filter(e =>
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Expense Tracking</h1>
          <p className="text-gray-400 mt-1">Track business operational costs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition"
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <span className="text-gray-300">From:</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-300">To:</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setDateRange({
                startDate: firstDay.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
              });
            }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition"
          >
            This Month
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), 0, 1);
              setDateRange({
                startDate: firstDay.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
              });
            }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition"
          >
            This Year
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Receipt size={20} className="text-red-400" />
              </div>
              <p className="text-gray-400">Total Expenses</p>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.summary.total_amount)}</p>
            <p className="text-sm text-gray-500 mt-1">{summary.summary.total_count} transactions</p>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingUp size={20} className="text-orange-400" />
              </div>
              <p className="text-gray-400">Average Daily</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(summary.summary.total_amount / 30)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Per day (avg)</p>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <PieChart size={20} className="text-purple-400" />
              </div>
              <p className="text-gray-400">Categories</p>
            </div>
            <p className="text-2xl font-bold text-white">{summary.by_category.length}</p>
            <p className="text-sm text-gray-500 mt-1">Different expense types</p>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {summary && summary.by_category && summary.by_category.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Expense by Category</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {summary.by_category.map((cat, idx) => {
                const percentage = (cat.total_amount / summary.summary.total_amount) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{cat.category}</span>
                      <span className="text-white font-semibold">{formatCurrency(cat.total_amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{cat.count} transactions</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="Search expenses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={18} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-gray-400 text-sm">Date</th>
                <th className="px-6 py-3 text-gray-400 text-sm">Category</th>
                <th className="px-6 py-3 text-gray-400 text-sm">Description</th>
                <th className="px-6 py-3 text-gray-400 text-sm text-right">Amount</th>
                <th className="px-6 py-3 text-gray-400 text-sm">Recorded By</th>
                <th className="px-6 py-3 text-gray-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-gray-300">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-700 rounded-lg text-sm text-white">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300 max-w-xs truncate">
                    {expense.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-red-400 font-semibold">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {expense.created_by_name || 'System'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingExpense(expense);
                          setFormData({
                            category: expense.category,
                            amount: expense.amount,
                            description: expense.description || '',
                            expense_date: expense.expense_date.split('T')[0]
                          });
                          setShowModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <Receipt size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No expenses found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editingExpense ? 'Edit Expense' : 'Add Expense'}
                </h2>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Amount *</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 pl-9 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition">
                    {editingExpense ? 'Update' : 'Save'}
                  </button>
                  <button type="button" onClick={resetModal} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;