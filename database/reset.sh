#!/bin/bash

# Database reset script
echo "⚠️  DANGER: This will completely reset the database!"
echo "All data will be lost. Are you sure? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🗑️  Dropping existing database..."
    
    # Set default values
    DB_NAME="restaurant_db"
    DB_USER=${DB_USER:-"postgres"}
    DB_HOST=${DB_HOST:-"localhost"}
    DB_PORT=${DB_PORT:-"5432"}
    
    # Drop database if exists
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
    
    # Run setup
    ./setup.sh
else
    echo "❌ Database reset cancelled."
fi