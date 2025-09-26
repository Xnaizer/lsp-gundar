# Restaurant Database Reset Script for Windows
Write-Host "⚠️ DANGER: This will completely reset the database!" -ForegroundColor Red
Write-Host "All data will be lost. Are you sure? (y/N): " -NoNewline -ForegroundColor Yellow

$response = Read-Host

if ($response -match "^[Yy]$") {
    Write-Host "🗑️ Dropping existing database..." -ForegroundColor Yellow
    
    # Set default values
    $DB_NAME = "restaurant_db"
    $DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
    $DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
    $DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
    
    try {
        # Drop database if exists
        & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
        
        # Run setup
        .\setup.ps1
    } catch {
        Write-Host "❌ Reset failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Database reset cancelled." -ForegroundColor Gray
}