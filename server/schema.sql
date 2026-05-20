-- ============================================
-- COMPLETE DATABASE SCHEMA FOR ETHIOPIAN RESTAURANT POS
-- Includes: Wastage tracking, Waiter assignments, Stock transactions
-- ============================================

-- ============================================
-- 1. USERS TABLE (with waiter shift support)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    business_id INTEGER DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. TABLES TABLE (with waiter assignment)
-- ============================================
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available',
    current_order_id INTEGER,
    assigned_waiter_id INTEGER REFERENCES users(id),
    assignment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. WAITER SHIFTS TABLE (Daily table assignments)
-- ============================================
CREATE TABLE IF NOT EXISTS waiter_shifts (
    id SERIAL PRIMARY KEY,
    waiter_id INTEGER REFERENCES users(id),
    table_ids INTEGER[],
    shift_date DATE DEFAULT CURRENT_DATE,
    shift_start TIME DEFAULT '08:00',
    shift_end TIME DEFAULT '22:00',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    business_id INTEGER DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. INGREDIENTS TABLE (with wastage tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    business_id INTEGER DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 0,
    min_stock DECIMAL(10,2) DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    category VARCHAR(50),
    supplier VARCHAR(100),
    wastage_percentage DECIMAL(5,2) DEFAULT 0,
    cooking_loss_percentage DECIMAL(5,2) DEFAULT 0,
    yield_percentage DECIMAL(5,2) DEFAULT 100,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. RECIPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, ingredient_id)
);

-- ============================================
-- 7. ORDERS TABLE (with waiter tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    total_amount DECIMAL(10,2) DEFAULT 0,
    order_type VARCHAR(20) DEFAULT 'dine_in',
    table_id INTEGER REFERENCES tables(id),
    waiter_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    confirmed_by INTEGER REFERENCES users(id),
    confirmed_at TIMESTAMP,
    source VARCHAR(20) DEFAULT 'waiter',
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. KITCHEN ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kitchen_orders (
    id SERIAL PRIMARY KEY,
    order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. STOCK TRANSACTIONS TABLE (Wastage tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_transactions (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    expected_quantity DECIMAL(10,3) DEFAULT 0,
    actual_quantity DECIMAL(10,3) DEFAULT 0,
    wastage_amount DECIMAL(10,3) DEFAULT 0,
    wastage_percentage DECIMAL(5,2) DEFAULT 0,
    transaction_type VARCHAR(50) DEFAULT 'order_deduction',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. SALES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20),
    status VARCHAR(20) DEFAULT 'completed',
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 12. SALE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 13. CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    notes TEXT,
    last_visit TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 14. EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    business_id INTEGER DEFAULT 1,
    user_id INTEGER REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 15. WAITER ASSIGNED TABLES VIEW
-- ============================================
CREATE OR REPLACE VIEW waiter_assigned_tables AS
SELECT 
    w.id as waiter_id,
    w.name as waiter_name,
    t.id as table_id,
    t.table_number,
    t.status,
    t.capacity,
    ws.shift_date
FROM users w
JOIN waiter_shifts ws ON w.id = ws.waiter_id
JOIN UNNEST(ws.table_ids) AS table_id ON TRUE
JOIN tables t ON t.id = table_id
WHERE ws.is_active = true 
  AND ws.shift_date = CURRENT_DATE;

-- ============================================
-- 16. PROFIT SUMMARY VIEW
-- ============================================
CREATE OR REPLACE VIEW profit_summary AS
WITH daily_revenue AS (
    SELECT 
        DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as order_count
    FROM orders
    WHERE payment_status = 'paid' AND status = 'completed'
    GROUP BY DATE(created_at)
),
daily_expenses AS (
    SELECT 
        DATE(expense_date) as date,
        SUM(amount) as expenses
    FROM expenses
    GROUP BY DATE(expense_date)
)
SELECT 
    COALESCE(r.date, e.date) as date,
    COALESCE(r.revenue, 0) as revenue,
    COALESCE(r.order_count, 0) as orders,
    COALESCE(e.expenses, 0) as expenses,
    COALESCE(r.revenue, 0) - COALESCE(e.expenses, 0) as profit,
    CASE 
        WHEN COALESCE(r.revenue, 0) > 0 
        THEN ((COALESCE(r.revenue, 0) - COALESCE(e.expenses, 0)) / COALESCE(r.revenue, 0)) * 100
        ELSE 0
    END as profit_margin
FROM daily_revenue r
FULL OUTER JOIN daily_expenses e ON r.date = e.date;

-- ============================================
-- 17. LOW STOCK ALERT VIEW
-- ============================================
CREATE OR REPLACE VIEW low_stock_alert AS
SELECT 
    id, 
    name, 
    quantity, 
    min_stock, 
    unit, 
    category,
    CASE 
        WHEN quantity <= 0 THEN 'OUT OF STOCK'
        WHEN quantity <= min_stock THEN 'CRITICAL'
        WHEN quantity <= min_stock * 1.5 THEN 'LOW'
        ELSE 'OK'
    END as alert_level
FROM ingredients 
WHERE quantity <= min_stock * 1.5
ORDER BY (quantity / NULLIF(min_stock, 0)) ASC;

-- ============================================
-- 18. INDEXES (Performance optimization)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_ingredients_low_stock ON ingredients(quantity, min_stock);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_ingredient ON stock_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_order ON stock_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_date ON stock_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_waiter_shifts_date ON waiter_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_waiter_shifts_waiter ON waiter_shifts(waiter_id);
CREATE INDEX IF NOT EXISTS idx_tables_assigned_waiter ON tables(assigned_waiter_id);

-- ============================================
-- 19. SAMPLE DATA
-- ============================================

-- Insert sample tables (1-10)
INSERT INTO tables (table_number, capacity, status) VALUES 
(1, 2, 'available'),
(2, 4, 'available'),
(3, 4, 'available'),
(4, 6, 'available'),
(5, 6, 'available'),
(6, 8, 'available'),
(7, 8, 'available'),
(8, 10, 'available'),
(9, 10, 'available'),
(10, 12, 'available')
ON CONFLICT (table_number) DO NOTHING;

-- Insert sample products
INSERT INTO products (business_id, name, price, category, is_available) VALUES 
(1, 'Doro Wat (Spicy Chicken)', 220, 'Main Dish', true),
(1, 'Kitfo (Minced Beef)', 280, 'Main Dish', true),
(1, 'Tibs (Sautéed Beef)', 250, 'Main Dish', true),
(1, 'Shiro Wat (Chickpea Stew)', 120, 'Vegetarian', true),
(1, 'Misir Wat (Lentil Stew)', 110, 'Vegetarian', true),
(1, 'Gomen (Collard Greens)', 90, 'Side Dish', true),
(1, 'Ethiopian Coffee', 45, 'Beverage', true),
(1, 'Tej (Honey Wine)', 60, 'Beverage', true),
(1, 'Injera (5 pcs)', 30, 'Staple', true)
ON CONFLICT DO NOTHING;

-- Insert sample users (password: admin123 - bcrypt hash)
INSERT INTO users (business_id, name, email, password, role, status, is_active, created_at) VALUES 
(1, 'Admin User', 'admin@ethiopos.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'owner', 'active', true, NOW()),
(1, 'Manager User', 'manager@ethiopos.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'manager', 'active', true, NOW()),
(1, 'Cashier User', 'cashier@ethiopos.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'cashier', 'active', true, NOW()),
(1, 'Waiter Kebede', 'waiter@ethiopos.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'waiter', 'active', true, NOW()),
(1, 'Kitchen Chef', 'kitchen@ethiopos.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'kitchen', 'active', true, NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert sample ingredients with wastage factors
INSERT INTO ingredients (business_id, name, unit, quantity, min_stock, unit_cost, category, wastage_percentage, cooking_loss_percentage) VALUES 
(1, 'Beef (Raw)', 'kg', 50, 10, 850, 'Meat', 15, 30),
(1, 'Chicken (Whole)', 'kg', 30, 8, 320, 'Meat', 12, 25),
(1, 'Onions', 'kg', 40, 10, 45, 'Vegetables', 10, 15),
(1, 'Garlic', 'kg', 8, 2, 180, 'Spices', 5, 0),
(1, 'Berbere Spice', 'kg', 10, 3, 280, 'Spices', 2, 0),
(1, 'Butter', 'kg', 20, 5, 350, 'Dairy', 3, 5),
(1, 'Injera', 'pcs', 200, 50, 8, 'Staples', 5, 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- 20. VERIFY ALL TABLES
-- ============================================
SELECT 'users' as table_name, COUNT(*) as count FROM users UNION ALL
SELECT 'tables', COUNT(*) FROM tables UNION ALL
SELECT 'waiter_shifts', COUNT(*) FROM waiter_shifts UNION ALL
SELECT 'products', COUNT(*) FROM products UNION ALL
SELECT 'ingredients', COUNT(*) FROM ingredients UNION ALL
SELECT 'recipes', COUNT(*) FROM recipes UNION ALL
SELECT 'orders', COUNT(*) FROM orders UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items UNION ALL
SELECT 'kitchen_orders', COUNT(*) FROM kitchen_orders UNION ALL
SELECT 'stock_transactions', COUNT(*) FROM stock_transactions UNION ALL
SELECT 'sales', COUNT(*) FROM sales UNION ALL
SELECT 'customers', COUNT(*) FROM customers UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses;