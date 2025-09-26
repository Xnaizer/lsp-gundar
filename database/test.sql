-- Quick test queries to verify database setup

-- Test 1: Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 2: Check sample data
SELECT 'Categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Stock Histories', COUNT(*) FROM stock_histories;

-- Test 3: Check relationships
SELECT 
    o.id_order,
    c.name as customer,
    o.total_amount,
    o.status,
    COUNT(oi.id_order_item) as items_count
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id_customer
LEFT JOIN order_items oi ON o.id_order = oi.order_id
GROUP BY o.id_order, c.name, o.total_amount, o.status
ORDER BY o.id_order;

-- Test 4: Check views
SELECT * FROM order_summary LIMIT 5;
SELECT * FROM product_sales_stats LIMIT 5;
SELECT * FROM low_stock_alert LIMIT 5;