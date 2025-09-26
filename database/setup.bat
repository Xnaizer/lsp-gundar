@echo off
echo 🚀 Setting up Restaurant Database...
echo.

REM Check if PostgreSQL is in PATH
psql --version >nul 2>&1
if errorlevel 1 (
    echo ❌ psql command not found!
    echo Please add PostgreSQL bin directory to your PATH
    echo Example: C:\Program Files\PostgreSQL\15\bin
    echo.
    echo Or run this in PowerShell as Administrator:
    echo $env:PATH += ";C:\Program Files\PostgreSQL\15\bin"
    pause
    exit /b 1
)

REM Set default values
set DB_NAME=restaurant_db
if "%DB_USER%"=="" set DB_USER=postgres
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432

echo 📝 Database Configuration:
echo    Host: %DB_HOST%
echo    Port: %DB_PORT%
echo    User: %DB_USER%
echo    Database: %DB_NAME%
echo.

echo 🏗️ Creating database and tables...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -f schema.sql

if errorlevel 1 (
    echo ❌ Database setup failed!
    pause
    exit /b 1
)

echo ✅ Database setup completed successfully!
echo.
echo 📊 Database Summary:
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 'Categories: ' || COUNT(*) as info FROM categories UNION ALL SELECT 'Products: ' || COUNT(*) FROM products UNION ALL SELECT 'Customers: ' || COUNT(*) FROM customers UNION ALL SELECT 'Sample Orders: ' || COUNT(*) FROM orders;"
echo.
echo 🎉 You can now start the backend server!
pause