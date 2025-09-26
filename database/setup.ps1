# Restaurant Database Setup Script for Windows
Write-Host "🚀 Setting up Restaurant Database..." -ForegroundColor Green

# Check if PostgreSQL is installed and running
try {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if (-not $pgService -or $pgService.Status -ne "Running") {
        Write-Host "❌ PostgreSQL service is not running. Please start PostgreSQL first." -ForegroundColor Red
        Write-Host "You can start it with: net start postgresql-x64-15" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "⚠️ Could not check PostgreSQL service status. Continuing anyway..." -ForegroundColor Yellow
}

# Set default values
$DB_NAME = "restaurant_db"
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }

Write-Host "📝 Database Configuration:" -ForegroundColor Cyan
Write-Host "   Host: $DB_HOST"
Write-Host "   Port: $DB_PORT"  
Write-Host "   User: $DB_USER"
Write-Host "   Database: $DB_NAME"
Write-Host ""

# Check if psql is available
try {
    & psql --version | Out-Null
} catch {
    Write-Host "❌ psql command not found!" -ForegroundColor Red
    Write-Host "Please add PostgreSQL bin directory to your PATH:" -ForegroundColor Yellow
    Write-Host "Example: C:\Program Files\PostgreSQL\15\bin" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run this command in PowerShell as Administrator:" -ForegroundColor Yellow
    Write-Host '$env:PATH += ";C:\Program Files\PostgreSQL\15\bin"' -ForegroundColor Gray
    exit 1
}

# Create database and run schema
Write-Host "🏗️ Creating database and tables..." -ForegroundColor Green

try {
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -f "schema.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database setup completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Database Summary:" -ForegroundColor Cyan
        
        $summaryQuery = @"
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
"@
        
        & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $summaryQuery
        Write-Host ""
        Write-Host "🎉 You can now start the backend server!" -ForegroundColor Green
    } else {
        throw "psql command failed"
    }
} catch {
    Write-Host "❌ Database setup failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}