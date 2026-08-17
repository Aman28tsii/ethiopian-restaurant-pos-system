import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { 
  ShoppingCart, Trash2, CheckCircle, Search,
  CreditCard, Smartphone, DollarSign
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, getProductEmoji } from '../../utils/formatting';

const ManualOrder = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchTables();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await API.get('/products');
      const productsData = response.data.data || [];
      setProducts(productsData);
      const uniqueCategories = ['all'].concat(productsData.filter(function(p) { return p.category; }).map(function(p) { return p.category; }));
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await API.get('/tables');
      setTables(response.data.data || []);
    } catch (err) {
      console.error('Fetch tables error:', err);
    }
  };

  const addToCart = function(product) {
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    setCart(function(prev) {
      const existing = prev.find(function(item) { return item.id === product.id; });
      if (existing) {
        return prev.map(function(item) {
          if (item.id === product.id) {
            return { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price };
          }
          return item;
        });
      }
      return prev.concat([{
        id: product.id,
        name: product.name,
        price: price,
        quantity: 1,
        total: price
      }]);
    });
  };

  const updateQuantity = function(productId, delta) {
    setCart(function(prev) {
      const item = prev.find(function(i) { return i.id === productId; });
      if (!item) return prev;
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter(function(i) { return i.id !== productId; });
      }
      return prev.map(function(i) {
        if (i.id === productId) {
          return { ...i, quantity: newQuantity, total: newQuantity * i.price };
        }
        return i;
      });
    });
  };

  const removeFromCart = function(productId) {
    setCart(function(prev) { return prev.filter(function(item) { return item.id !== productId; }); });
  };

  const clearCart = function() {
    if (window.confirm(t('clearCart'))) {
      setCart([]);
    }
  };

  const placeOrder = async function() {
    if (cart.length === 0) {
      alert(t('pleaseAddItems'));
      return;
    }

    if (orderType === 'dine_in' && !selectedTableId) {
      alert(t('pleaseSelectTable'));
      return;
    }

    setProcessing(true);
    try {
      const orderData = {
        items: cart.map(function(item) { return { product_id: item.id, quantity: item.quantity }; }),
        customer_name: customerName.trim() || t('walkInCustomer'),
        customer_phone: customerPhone || null,
        table_id: selectedTableId || null,
        order_type: orderType,
        notes: specialInstructions,
        source: 'cashier_manual',
        payment_method: paymentMethod
      };

      const response = await API.post('/orders', orderData);
      
      if (response.data.success) {
        setOrderNumber(response.data.data.order_number);
        setOrderComplete(true);
        setCart([]);
      }
    } catch (err) {
      console.error('Place order error:', err);
      alert(err.response?.data?.error || t('failedToSubmitOrder'));
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = function() {
    setCustomerName('');
    setCustomerPhone('');
    setSpecialInstructions('');
    setSelectedTableId('');
    setOrderType('dine_in');
    setPaymentMethod('cash');
    setSearchTerm('');
  };

  const startNewOrder = function() {
    setOrderComplete(false);
    setOrderNumber(null);
    resetForm();
  };

  const filteredProducts = products.filter(function(product) {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.reduce(function(sum, item) { return sum + item.total; }, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('orderComplete')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('orderSentKitchen')}</p>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('orderNumber')}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{orderNumber}</p>
            <p className="text-green-600 dark:text-green-400 font-bold mt-2">{formatCurrency(total)}</p>
          </div>
          
          <button
            onClick={startNewOrder}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition"
          >
            {t('newOrder')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Left Panel - Products */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('manualOrder')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('createManualOrder')}</p>
        </div>

        {/* Order Type Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="dine_in"
                checked={orderType === 'dine_in'}
                onChange={function(e) {
                  setOrderType(e.target.value);
                  if (e.target.value === 'takeaway') {
                    setSelectedTableId('');
                  }
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">{t('dineIn')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="takeaway"
                checked={orderType === 'takeaway'}
                onChange={function(e) {
                  setOrderType(e.target.value);
                  if (e.target.value === 'takeaway') {
                    setSelectedTableId('');
                  }
                }}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">{t('takeaway')}</span>
            </label>
          </div>

          {orderType === 'dine_in' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('selectTable')} <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTableId}
                onChange={function(e) { setSelectedTableId(e.target.value); }}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- {t('selectTable')} --</option>
                {tables.filter(function(t) { return t.status === 'available'; }).map(function(table) {
                  return (
                    <option key={table.id} value={table.id}>
                      {t('table')} {table.table_number} ({t('capacity')}: {table.capacity}) - {t('available')}
                    </option>
                  );
                })}
              </select>
              {tables.filter(function(t) { return t.status === 'available'; }).length === 0 && (
                <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-2">
                  No available tables
                </p>
              )}
            </div>
          )}

          {orderType === 'takeaway' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-blue-700 dark:text-blue-400 text-sm flex items-center gap-2">
                <span>Takeaway order</span>
              </p>
            </div>
          )}
        </div>

        {/* Search and Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('searchProducts')}
              value={searchTerm}
              onChange={function(e) { setSearchTerm(e.target.value); }}
              className="w-full px-4 py-3 pl-10 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(function(cat) {
              return (
                <button
                  key={cat}
                  onClick={function() { setSelectedCategory(cat); }}
                  className={'px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ' + (selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
                >
                  {cat === 'all' ? t('allItems') : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Grid with Emojis */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredProducts.map(function(product) {
            return (
              <button
                key={product.id}
                onClick={function() { addToCart(product); }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-left hover:border-blue-500 transition hover:shadow-md"
              >
                <div className="text-4xl text-center mb-2">{getProductEmoji(product.category)}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">{formatCurrency(product.price)}</p>
                <span className="text-xs text-green-600 dark:text-green-400 mt-1 inline-block">+ Add</span>
              </button>
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">{t('noProductsFound')}</p>
          </div>
        )}
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-120px)] sticky top-6 shadow-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={24} className="text-blue-500 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('currentOrder')}</h2>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-red-500 dark:text-red-400 text-sm hover:text-red-600 dark:hover:text-red-300">
                {t('clearCart')}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-gray-500 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{t('cartEmpty')}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('tapToAdd')}</p>
            </div>
          ) : (
            cart.map(function(item) {
              return (
                <div key={item.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                      <p className="text-blue-600 dark:text-blue-400 text-sm">{formatCurrency(item.price)}</p>
                    </div>
                    <button onClick={function() { removeFromCart(item.id); }} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={function() { updateQuantity(item.id, -1); }}
                        className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                      >
                        -
                      </button>
                      <span className="text-gray-900 dark:text-white font-semibold text-lg w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={function() { updateQuantity(item.id, 1); }}
                        className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(item.total)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <input
            type="text"
            placeholder={t('customerNameOptional')}
            value={customerName}
            onChange={function(e) { setCustomerName(e.target.value); }}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="tel"
            placeholder={t('customerPhoneOptional')}
            value={customerPhone}
            onChange={function(e) { setCustomerPhone(e.target.value); }}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder={t('specialInstructions')}
            value={specialInstructions}
            onChange={function(e) { setSpecialInstructions(e.target.value); }}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />

          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{t('paymentMethod')}</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={function() { setPaymentMethod('cash'); }}
                className={'py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ' + (paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
              >
                <DollarSign size={16} /> {t('cash')}
              </button>
              <button
                onClick={function() { setPaymentMethod('card'); }}
                className={'py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ' + (paymentMethod === 'card' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
              >
                <CreditCard size={16} /> {t('card')}
              </button>
              <button
                onClick={function() { setPaymentMethod('mobile'); }}
                className={'py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition ' + (paymentMethod === 'mobile' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')}
              >
                <Smartphone size={16} /> {t('mobile')}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-gray-600 dark:text-gray-400 text-sm">
              <span>{t('subtotal')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400 text-sm">
              <span>{t('vat')}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-gray-900 dark:text-white font-bold text-lg pt-2">
              <span>{t('total')}</span>
              <span className="text-green-600 dark:text-green-400">{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            onClick={placeOrder}
            disabled={cart.length === 0 || processing}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? t('processing') : t('completeOrder')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualOrder;
