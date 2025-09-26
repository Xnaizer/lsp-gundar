#!/bin/bash

# Database setup script for Restaurant Management System
echo "🚀 Setting up Restaurant Database..."

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Set default values
DB_NAME="restaurant_db"
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

echo "📝 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# Create database and run schema
echo "🏗️  Creating database and tables..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -f schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
    echo ""
    echo "📊 Database Summary:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
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
            'Sample Orders: ' || COUNT(*) as info
        FROM orders;
    "
    echo ""
    echo "🎉 You can now start the backend server!"
else
    echo "❌ Database setup failed!"
    exit 1
fi