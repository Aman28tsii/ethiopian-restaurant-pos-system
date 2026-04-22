-- Users table
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

-- Tables table
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available',
    current_order_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
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

-- Ingredients table
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, ingredient_id)
);

-- Orders table
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
    created_by INTEGER REFERENCES users(id),
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kitchen Orders table
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

-- Sales table
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

-- Sale Items table
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- Insert sample tables
INSERT INTO tables (table_number, capacity, status) VALUES 
(1, 4, 'available'),
(2, 4, 'available'),
(3, 4, 'available'),
(4, 2, 'available'),
(5, 2, 'available'),
(6, 6, 'available'),
(7, 6, 'available'),
(8, 8, 'available'),
(9, 8, 'available'),
(10, 10, 'available')
ON CONFLICT (table_number) DO NOTHING;

-- Insert sample products
INSERT INTO products (business_id, name, price, category, is_available) VALUES 
(1, 'Doro Wat', 15.99, 'Main Course', true),
(1, 'Kitfo', 18.99, 'Main Course', true),
(1, 'Tibs', 16.99, 'Main Course', true),
(1, 'Shiro Wat', 12.99, 'Vegetarian', true),
(1, 'Misir Wat', 11.99, 'Vegetarian', true),
(1, 'Ethiopian Coffee', 5.99, 'Beverage', true)
ON CONFLICT DO NOTHING;

-- Insert sample users (password: admin123)
INSERT INTO users (business_id, name, email, password, role, status, is_active, created_at) VALUES 
(1, 'Admin User', 'admin@example.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'owner', 'active', true, NOW()),
(1, 'Manager User', 'manager@example.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'manager', 'active', true, NOW()),
(1, 'Cashier User', 'cashier@example.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'cashier', 'active', true, NOW()),
(1, 'Waiter User', 'waiter@example.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'waiter', 'active', true, NOW()),
(1, 'Kitchen Staff', 'kitchen@example.com', '$2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82', 'kitchen', 'active', true, NOW())
ON CONFLICT (email) DO NOTHING;

-- Verify data
SELECT 'Users:' as Type, COUNT(*) as Count FROM users
UNION ALL
SELECT 'Tables:', COUNT(*) FROM tables
UNION ALL
SELECT 'Products:', COUNT(*) FROM products;