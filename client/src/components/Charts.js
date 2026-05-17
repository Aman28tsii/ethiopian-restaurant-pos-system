import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Format currency
const formatCurrency = (value) => {
  return `Br ${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Revenue & Profit Line Chart
export const RevenueChart = ({ data, title }) => {
  const { t } = useLanguage();
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-gray-500">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">{title || t('revenueProfitTrend')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" tickFormatter={(value) => `Br ${value}`} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => `${t('date')}: ${label}`}
          />
          <Legend formatter={(value) => t(value.toLowerCase())} />
          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="revenue" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="profit" stroke="#10b981" name="profit" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Top Products Bar Chart
export const TopProductsChart = ({ data, title }) => {
  const { t } = useLanguage();
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-gray-500">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">{title || t('topSellingProducts')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" stroke="#9ca3af" tickFormatter={(value) => `Br ${value}`} />
          <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => `${t('product')}: ${label}`}
          />
          <Bar dataKey="revenue" fill="#8b5cf6" name={t('revenue')} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Payment Methods Pie Chart
export const PaymentMethodsChart = ({ data, title }) => {
  const { t } = useLanguage();
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-gray-500">{t('noData')}</p>
      </div>
    );
  }

  // Translate payment method names
  const translatePaymentMethod = (method) => {
    const methods = {
      'cash': t('cash'),
      'card': t('card'),
      'mobile': t('mobile')
    };
    return methods[method] || method;
  };

  const translatedData = data.map(item => ({
    ...item,
    payment_method: translatePaymentMethod(item.payment_method)
  }));

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">{title || t('paymentMethods')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={translatedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="total"
            nameKey="payment_method"
          >
            {translatedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            formatter={(value) => formatCurrency(value)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Hourly Sales Area Chart
export const HourlySalesChart = ({ data, title }) => {
  const { t } = useLanguage();
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <p className="text-gray-500">{t('noData')}</p>
      </div>
    );
  }

  // Format hour display
  const formattedData = data.map(item => ({
    ...item,
    hour: `${String(item.hour).padStart(2, '0')}:00`
  }));

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">{title || t('hourlySalesTrend')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="hour" stroke="#9ca3af" label={{ value: t('hour'), position: 'insideBottom', offset: -5 }} />
          <YAxis stroke="#9ca3af" tickFormatter={(value) => `Br ${value}`} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => `${t('hour')}: ${label}`}
          />
          <Legend formatter={(value) => t(value.toLowerCase())} />
          <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="revenue" />
          <Area type="monotone" dataKey="orders" stackId="2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="orders" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};