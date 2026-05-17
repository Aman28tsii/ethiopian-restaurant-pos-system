import React, { useState } from 'react';
import { Bell, User, Search, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import RealTimeNotifications from './RealTimeNotifications';

const Topbar = ({ user }) => {
  const { language, setLanguage, t } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'am', name: 'አማርኛ', flag: '🇪🇹' }
  ];

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex justify-between items-center">
        {/* Page Title */}
        <div>
          <h2 className="text-xl font-semibold text-white">{t('welcome')}, {user?.name?.split(' ')[0] || 'Staff'}!</h2>
          <p className="text-sm text-gray-400">{t('readyToServe')}</p>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-gray-700 rounded-xl px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder={t('search')}
              className="bg-transparent border-none text-white placeholder-gray-400 focus:outline-none px-2 w-64"
            />
          </div>
          
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <Globe size={20} className="text-gray-400" />
              <span className="text-gray-300 text-sm hidden sm:inline">
                {language === 'en' ? 'EN' : 'አማ'}
              </span>
            </button>
            
            {showLanguageMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLanguageMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition flex items-center gap-2 ${
                      language === lang.code ? 'bg-gray-700 text-blue-400' : 'text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {language === lang.code && <span className="ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Real-time Notifications */}
          <RealTimeNotifications />
          
          {/* User Menu */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <User size={20} className="text-gray-400" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">{user?.name || 'Staff'}</p>
              <p className="text-xs text-gray-400 capitalize">{t(user?.role) || user?.role || 'cashier'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;