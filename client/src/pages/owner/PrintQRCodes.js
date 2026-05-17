import React, { useState } from 'react';
import { Printer, Download, QrCode, Copy } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const PrintQRCodes = () => {
  const { t } = useLanguage();
  const [tables] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const baseUrl = window.location.origin;

  const printPage = () => {
    window.print();
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL copied!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('printQRCodes')}</h1>
          <p className="text-gray-400 mt-1">{t('generateAndPrintQRCodes')}</p>
        </div>
        <button
          onClick={printPage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
        >
          <Printer size={18} />
          {t('printAll')}
        </button>
      </div>

      {/* QR Codes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-5">
        {tables.map(table => (
          <div 
            key={table} 
            className="bg-white rounded-xl p-4 text-center print:shadow-none print:border print:border-gray-300"
          >
            {/* QR Code Image */}
            <div className="bg-gray-100 p-3 rounded-lg mb-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${baseUrl}/qr-menu?table=${table}`)}`}
                alt={`Table ${table} QR Code`}
                className="mx-auto"
                style={{ width: '120px', height: '120px' }}
              />
            </div>
            
            {/* Table Info */}
            <p className="font-bold text-gray-800 text-lg">{t('table')} {table}</p>
            <p className="text-xs text-gray-500 mt-1 break-all hidden print:block">
              {baseUrl}/qr-menu?table={table}
            </p>
            
            {/* Actions (hidden when printing) */}
            <div className="mt-3 flex gap-2 justify-center print:hidden">
              <button
                onClick={() => copyUrl(`${baseUrl}/qr-menu?table=${table}`)}
                className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-300"
              >
                <Copy size={12} />
                {t('copyUrl')}
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `table-${table}-qr.png`;
                  link.href = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseUrl}/qr-menu?table=${table}`)}`;
                  link.click();
                }}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-200"
              >
                <Download size={12} />
                {t('download')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 print:hidden">
        <p className="text-blue-400 text-sm">
          💡 {t('qrPrintInstructions')}
        </p>
      </div>

      {/* Print Instructions (visible only when printing) */}
      <div className="hidden print:block text-center mt-8">
        <p className="text-gray-500 text-sm">
          Cut along the lines and place on each table
        </p>
      </div>
    </div>
  );
};

export default PrintQRCodes;