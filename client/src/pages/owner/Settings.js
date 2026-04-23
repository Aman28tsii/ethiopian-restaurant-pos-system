import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { Save, Building, Phone, Mail, Clock, Percent, Printer, Loader2 } from 'lucide-react';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    restaurantName: 'EthioPOS Restaurant',
    address: 'Addis Ababa, Ethiopia',
    phone: '+251-XXX-XXX-XXX',
    email: 'info@ethiopos.com',
    taxRate: 15,
    workingHours: '9:00 AM - 10:00 PM',
    receiptFooter: 'Thank you for dining with us!'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    
    // Simulate save to localStorage (or API if you have a settings endpoint)
    setTimeout(() => {
      localStorage.setItem('restaurantSettings', JSON.stringify(settings));
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('restaurantSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Configure your restaurant preferences</p>
        </div>
        {saved && (
          <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-xl text-sm">
            Settings saved successfully!
          </div>
        )}
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Restaurant Info Section */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building size={20} className="text-blue-400" />
              Restaurant Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  name="restaurantName"
                  value={settings.restaurantName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={settings.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Phone size={14} /> Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={settings.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Mail size={14} /> Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={settings.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Business Settings Section */}
          <div className="border-t border-gray-700 pt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Percent size={20} className="text-green-400" />
              Business Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  name="taxRate"
                  value={settings.taxRate}
                  onChange={handleChange}
                  step="0.5"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Clock size={14} /> Working Hours
                </label>
                <input
                  type="text"
                  name="workingHours"
                  value={settings.workingHours}
                  onChange={handleChange}
                  placeholder="9:00 AM - 10:00 PM"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Receipt Settings Section */}
          <div className="border-t border-gray-700 pt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Printer size={20} className="text-purple-400" />
              Receipt Settings
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Receipt Footer Message</label>
              <textarea
                name="receiptFooter"
                value={settings.receiptFooter}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Thank you for dining with us!"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t border-gray-700 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Settings
            </button>
          </div>
        </div>
      </form>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-blue-400 text-sm">
          💡 Settings are saved to your browser. In a production environment, these would be saved to the database.
        </p>
      </div>
    </div>
  );
};

export default Settings;