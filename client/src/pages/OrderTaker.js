import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { 
    ShoppingCart, Trash2, CheckCircle, Search,
    User, Phone, Utensils, Send, Table as TableIcon,
    Coffee, Users, Clock, X, Plus, Minus, LogOut
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// ============================================
// HELPER FUNCTIONS
// ============================================
const getProductEmoji = (category) => {
    const emojis = {
        'Main Course': '🍛',
        'Beverage': '🥤',
        'Drink': '🥤',
        'Juice': '🧃',
        'Coffee': '☕',
        'Tea': '🍵',
        'Dessert': '🍰',
        'Appetizer': '🍢',
        'Soup': '🍲',
        'Salad': '🥗',
        'Breakfast': '🍳',
        'Traditional': '🇪🇹',
        'Ethiopian': '🇪🇹',
        'Side': '🥗',
        'Main Dish': '🍛',
        'Vegetarian': '🥬',
        'Bread': '🍞'
    };
    return emojis[category] || '🍽️';
};

const formatCurrency = (value) => {
    return `Br ${parseFloat(value || 0).toFixed(2)}`;
};

// ============================================
// ORDER TAKER LAYOUT
// ============================================
const OrderTakerLayout = ({ children, onLogout, user }) => {
    const { t } = useLanguage();
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Utensils size={28} className="text-blue-600 dark:text-blue-400" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Order Taker</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.name || 'Staff'} • Taking Orders</p>
                        </div>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                            Live
                        </span>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </header>
            <main className="p-4">
                {children}
            </main>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
const OrderTaker = () => {
    const { t } = useLanguage();
    const [user, setUser] = useState(null);
    
    // ============================================
    // STATE
    // ============================================
    const [products, setProducts] = useState([]);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState(null);

    // Get user from localStorage
    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error('Failed to parse user');
            }
        }
    }, []);

    // ============================================
    // FETCH DATA
    // ============================================
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [productsRes, tablesRes] = await Promise.all([
                API.get('/products'),
                API.get('/tables')
            ]);
            setProducts(productsRes.data.data || []);
            setTables(tablesRes.data.data || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // LOGOUT
    // ============================================
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // ============================================
    // CART OPERATIONS
    // ============================================
    const addToCart = (product) => {
        const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * price }
                        : item
                );
            }
            return [...prev, {
                id: product.id,
                name: product.name,
                price: price,
                quantity: 1,
                total: price
            }];
        });
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => {
            const item = prev.find(i => i.id === productId);
            if (!item) return prev;
            const newQty = item.quantity + delta;
            if (newQty <= 0) {
                return prev.filter(i => i.id !== productId);
            }
            return prev.map(i =>
                i.id === productId
                    ? { ...i, quantity: newQty, total: newQty * i.price }
                    : i
            );
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Clear all items from order?')) {
            setCart([]);
        }
    };

    // ============================================
    // PLACE ORDER
    // ============================================
    const placeOrder = async () => {
        if (cart.length === 0) {
            alert('Please add items to the order');
            return;
        }
        if (!selectedTable) {
            alert('Please select a table');
            return;
        }

        setSubmitting(true);
        try {
            const orderData = {
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity
                })),
                table_id: selectedTable,
                customer_name: customerName.trim() || 'Walk-in Customer',
                customer_phone: customerPhone || null,
                notes: notes,
                order_type: 'dine_in',
                source: 'order_taker'
            };

            const response = await API.post('/orders', orderData);
            
            if (response.data.success) {
                const order = response.data.data;
                setLastOrderNumber(order.order_number);
                setOrderSuccess(true);
                
                // Reset cart and form
                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
                setNotes('');
                
                setTimeout(() => setOrderSuccess(false), 5000);
            }
        } catch (err) {
            console.error('Order error:', err);
            alert(err.response?.data?.error || 'Failed to place order');
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // CATEGORIES & FILTERS
    // ============================================
    const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
    
    const filteredProducts = products.filter(product => {
        const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // ============================================
    // TOTALS
    // ============================================
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;

    // ============================================
    // LOADING
    // ============================================
    if (loading) {
        return (
            <OrderTakerLayout onLogout={handleLogout} user={user}>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </OrderTakerLayout>
        );
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <OrderTakerLayout onLogout={handleLogout} user={user}>
            <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                
                {/* ============================================ */}
                {/* LEFT PANEL - PRODUCTS & FORM */}
                {/* ============================================ */}
                <div className="flex-1 min-w-0">
                    {/* SUCCESS MESSAGE */}
                    {orderSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4 flex items-center gap-3 animate-fadeIn">
                            <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                            <div>
                                <p className="text-green-700 dark:text-green-400 font-semibold">Order #{lastOrderNumber} sent to kitchen!</p>
                                <p className="text-green-600 dark:text-green-300 text-sm">Kitchen is preparing the order.</p>
                            </div>
                        </div>
                    )}

                    {/* TABLE SELECTOR */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Select Table *
                                </label>
                                <select
                                    value={selectedTable}
                                    onChange={(e) => setSelectedTable(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Select Table --</option>
                                    {tables.map(table => (
                                        <option key={table.id} value={table.id}>
                                            Table {table.table_number} ({table.status}) - Cap: {table.capacity}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Customer Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Walk-in Customer"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="Optional"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-3">
                            <input
                                type="text"
                                placeholder="Special instructions (allergies, preferences, etc.)"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* SEARCH & CATEGORIES */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                                        selectedCategory === cat
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {cat === 'all' ? 'All Items' : cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PRODUCTS GRID */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-left hover:border-blue-500 hover:shadow-md transition-all duration-200 hover:scale-105"
                            >
                                <div className="text-3xl text-center mb-2">{getProductEmoji(product.category)}</div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">{product.name}</h3>
                                <p className="text-blue-600 dark:text-blue-400 font-bold text-sm mt-1">{formatCurrency(product.price)}</p>
                                <span className="text-xs text-green-600 dark:text-green-400 mt-1 inline-block">+ Add</span>
                            </button>
                        ))}
                    </div>
                    
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400">No products found</p>
                        </div>
                    )}
                </div>

                {/* ============================================ */}
                {/* RIGHT PANEL - CART */}
                {/* ============================================ */}
                <div className="w-full lg:w-96 xl:w-[420px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-120px)] lg:h-[calc(100vh-100px)] sticky top-4 shadow-lg">
                    
                    {/* CART HEADER */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={22} className="text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Current Order</h2>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-500">
                                    {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                                </span>
                            </div>
                            {cart.length > 0 && (
                                <button 
                                    onClick={clearCart} 
                                    className="text-red-500 hover:text-red-600 text-sm font-medium transition"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                        {selectedTable && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <TableIcon size={14} />
                                Table: {tables.find(t => t.id === parseInt(selectedTable))?.table_number || selectedTable}
                            </p>
                        )}
                    </div>

                    {/* CART ITEMS */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="text-center py-12">
                                <ShoppingCart size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Cart is empty</p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tap menu items to add</p>
                                <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Select a table first</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                                            <p className="text-blue-600 dark:text-blue-400 text-sm">{formatCurrency(item.price)}</p>
                                        </div>
                                        <button 
                                            onClick={() => removeFromCart(item.id)} 
                                            className="text-red-400 hover:text-red-600 p-1 transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                                            >
                                                <Minus size={14} className="text-gray-700 dark:text-gray-300" />
                                            </button>
                                            <span className="text-gray-900 dark:text-white font-semibold text-lg w-8 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                                            >
                                                <Plus size={14} className="text-gray-700 dark:text-gray-300" />
                                            </button>
                                        </div>
                                        <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(item.total)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* CART FOOTER */}
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
                        {/* TOTALS */}
                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between text-gray-600 dark:text-gray-400 text-sm">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600 dark:text-gray-400 text-sm">
                                <span>VAT (15%)</span>
                                <span>{formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between text-gray-900 dark:text-white font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span>Total</span>
                                <span className="text-green-600 dark:text-green-400">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <button
                            onClick={placeOrder}
                            disabled={cart.length === 0 || !selectedTable || submitting}
                            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <Send size={18} />
                            )}
                            {submitting ? 'Sending...' : 'Send to Kitchen'}
                        </button>
                        
                        {!selectedTable && cart.length > 0 && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center mt-2">⚠️ Please select a table</p>
                        )}
                        
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Order will be sent directly to kitchen
                        </p>
                    </div>
                </div>
            </div>
        </OrderTakerLayout>
    );
};

export default OrderTaker;