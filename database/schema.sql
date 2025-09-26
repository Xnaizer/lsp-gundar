-- Create database
CREATE DATABASE restaurant_db;

-- Use the database
\c restaurant_db;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS stock_histories CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Create Categories table
CREATE TABLE categories (
    id_category SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Customers table
CREATE TABLE customers (
    id_customer SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Products table
CREATE TABLE products (
    id_product SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category_id INT REFERENCES categories(id_category) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Orders table
CREATE TABLE orders (
    id_order SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id_customer) ON DELETE SET NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    total_amount NUMERIC(12,2) DEFAULT 0.00 CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Items table
CREATE TABLE order_items (
    id_order_item SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id_order) ON DELETE CASCADE,
    product_id INT REFERENCES products(id_product) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Payments table
CREATE TABLE payments (
    id_payment SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id_order) ON DELETE CASCADE,
    method VARCHAR(30) NOT NULL CHECK (method IN ('cash', 'non-cash')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_ref VARCHAR(255),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Stock Histories table
CREATE TABLE stock_histories (
    id_stock SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id_product) ON DELETE CASCADE,
    change INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_stock_histories_product ON stock_histories(product_id);
CREATE INDEX idx_stock_histories_date ON stock_histories(created_at);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample categories
INSERT INTO categories (name) VALUES 
('Makanan Utama'),
('Appetizer'),
('Minuman');

-- Insert sample products
INSERT INTO products (name, price, stock, category_id) VALUES 
('Nasi Goreng', 25000, 50, 1),
('Ayam Bakar', 35000, 30, 1),
('Mie Ayam', 20000, 40, 1),
('Gado-Gado', 22000, 25, 1),
('Soto Ayam', 18000, 35, 1),
('Kerupuk', 5000, 100, 2),
('Lumpia', 15000, 25, 2),
('Tahu Crispy', 12000, 30, 2),
('Pisang Goreng', 10000, 40, 2),
('Teh Es', 8000, 200, 3),
('Kopi', 12000, 150, 3),
('Jus Jeruk', 15000, 80, 3),
('Es Campur', 18000, 60, 3),
('Air Mineral', 5000, 300, 3);

-- Insert sample customers
INSERT INTO customers (name, phone, email) VALUES 
('John Doe', '081234567890', 'john@example.com'),
('Jane Smith', '081234567891', 'jane@example.com'),
('Bob Wilson', '081234567892', 'bob@example.com'),
('Alice Brown', '081234567893', 'alice@example.com');

-- Insert sample orders (for testing)
INSERT INTO orders (customer_id, status, total_amount, notes) VALUES 
(1, 'paid', 50000, 'Dine in - Table 5'),
(2, 'pending', 33000, 'Take away'),
(3, 'paid', 42000, 'Delivery - Jl. Sudirman 123'),
(1, 'cancelled', 25000, 'Customer changed mind');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES 
-- Order 1 (John Doe - paid)
(1, 1, 2, 25000, 50000), -- 2x Nasi Goreng

-- Order 2 (Jane Smith - pending)  
(2, 3, 1, 20000, 20000), -- 1x Mie Ayam
(2, 6, 1, 5000, 5000),   -- 1x Kerupuk
(2, 10, 1, 8000, 8000),  -- 1x Teh Es

-- Order 3 (Bob Wilson - paid)
(3, 2, 1, 35000, 35000), -- 1x Ayam Bakar
(3, 11, 1, 12000, 12000), -- 1x Kopi

-- Order 4 (John Doe - cancelled)
(4, 1, 1, 25000, 25000); -- 1x Nasi Goreng

-- Insert sample payments
INSERT INTO payments (order_id, method, amount, payment_ref, notes) VALUES 
(1, 'cash', 50000, NULL, 'Exact amount'),
(3, 'non-cash', 42000, 'TXN-20241201-001', 'Bank Transfer BCA');

-- Insert sample stock histories (simulating past stock changes)
INSERT INTO stock_histories (product_id, change, reason, previous_stock, new_stock) VALUES 
-- Initial stock entries
(1, 50, 'Initial stock', 0, 50),
(2, 30, 'Initial stock', 0, 30),
(3, 40, 'Initial stock', 0, 40),
(4, 25, 'Initial stock', 0, 25),
(5, 35, 'Initial stock', 0, 35),
(6, 100, 'Initial stock', 0, 100),
(7, 25, 'Initial stock', 0, 25),
(8, 30, 'Initial stock', 0, 30),
(9, 40, 'Initial stock', 0, 40),
(10, 200, 'Initial stock', 0, 200),
(11, 150, 'Initial stock', 0, 150),
(12, 80, 'Initial stock', 0, 80),
(13, 60, 'Initial stock', 0, 60),
(14, 300, 'Initial stock', 0, 300),

-- Stock changes from orders
(1, -2, 'Order #1', 50, 48),
(3, -1, 'Order #2', 40, 39),
(6, -1, 'Order #2', 100, 99),
(10, -1, 'Order #2', 200, 199),
(2, -1, 'Order #3', 30, 29),
(11, -1, 'Order #3', 150, 149);

-- Create a view for easy reporting
CREATE VIEW order_summary AS
SELECT 
    o.id_order,
    o.order_date,
    o.status,
    c.name as customer_name,
    c.phone as customer_phone,
    o.total_amount,
    o.notes,
    COUNT(oi.id_order_item) as total_items,
    CASE 
        WHEN p.id_payment IS NOT NULL THEN 'Paid'
        ELSE 'Unpaid'
    END as payment_status
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id_customer
LEFT JOIN order_items oi ON o.id_order = oi.order_id
LEFT JOIN payments p ON o.id_order = p.order_id
GROUP BY o.id_order, o.order_date, o.status, c.name, c.phone, o.total_amount, o.notes, p.id_payment
ORDER BY o.order_date DESC;

-- Create a view for product sales statistics
CREATE VIEW product_sales_stats AS
SELECT 
    p.id_product,
    p.name as product_name,
    c.name as category_name,
    p.price as current_price,
    p.stock as current_stock,
    COALESCE(SUM(oi.quantity), 0) as total_sold,
    COALESCE(SUM(oi.subtotal), 0) as total_revenue,
    COUNT(DISTINCT oi.order_id) as orders_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id_category
LEFT JOIN order_items oi ON p.id_product = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id_order AND o.status != 'cancelled'
GROUP BY p.id_product, p.name, c.name, p.price, p.stock
ORDER BY total_sold DESC;

-- Create a view for low stock alerts
CREATE VIEW low_stock_alert AS
SELECT 
    p.id_product,
    p.name as product_name,
    c.name as category_name,
    p.stock,
    p.price,
    CASE 
        WHEN p.stock = 0 THEN 'OUT_OF_STOCK'
        WHEN p.stock <= 5 THEN 'CRITICAL'
        WHEN p.stock <= 10 THEN 'LOW'
        ELSE 'OK'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id_category
WHERE p.is_active = true AND p.stock <= 10
ORDER BY p.stock ASC, p.name;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO restaurant_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO restaurant_user;

-- Display summary information
SELECT 'Database setup completed successfully!' as message;

SELECT 
    'Categories: ' || COUNT(*) as info
FROM categories
UNION ALL
SELECT 
    'Products: ' || COUNT(*) as info
FROM products
UNION ALL
SELECT 
    'Customers: ' || COUNT(*) as info
FROM customers
UNION ALL
SELECT 
    'Orders: ' || COUNT(*) as info
FROM orders
UNION ALL
SELECT 
    'Order Items: ' || COUNT(*) as info
FROM order_items
UNION ALL
SELECT 
    'Payments: ' || COUNT(*) as info
FROM payments
UNION ALL
SELECT 
    'Stock Histories: ' || COUNT(*) as info
FROM stock_histories;