# Initialize Superadmin Account
# 
# This script calls the initialization endpoint to update the superadmin account
# with credentials from environment variables.
#
# Usage:
#   .\initialize-superadmin.ps1
#
# Or set environment variables:
#   $env:BACKEND_URL="https://your-backend.railway.app"
#   $env:JWT_SECRET="your-jwt-secret"
#   .\initialize-superadmin.ps1

# Get values from environment variables or use defaults
$backendUrl = $env:BACKEND_URL
$jwtSecret = $env:JWT_SECRET

# Validate required variables
if (-not $backendUrl) {
    Write-Host "❌ ERROR: BACKEND_URL environment variable is required" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set BACKEND_URL before running this script:" -ForegroundColor Yellow
    Write-Host '  $env:BACKEND_URL="https://your-backend.railway.app"' -ForegroundColor Gray
    Write-Host '  $env:JWT_SECRET="your-jwt-secret"' -ForegroundColor Gray
    Write-Host '  .\initialize-superadmin.ps1' -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or set them in your PowerShell session or Railway environment variables" -ForegroundColor Gray
    exit 1
}

if (-not $jwtSecret) {
    Write-Host "❌ ERROR: JWT_SECRET environment variable is required" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set JWT_SECRET before running this script:" -ForegroundColor Yellow
    Write-Host '  $env:BACKEND_URL="https://your-backend.railway.app"' -ForegroundColor Gray
    Write-Host '  $env:JWT_SECRET="your-jwt-secret"' -ForegroundColor Gray
    Write-Host '  .\initialize-superadmin.ps1' -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or set them in your PowerShell session or Railway environment variables" -ForegroundColor Gray
    exit 1
}

Write-Host "🔧 Initializing superadmin account..." -ForegroundColor Cyan
Write-Host "📍 Backend URL: $backendUrl" -ForegroundColor Gray
Write-Host ""

$url = "$backendUrl/api/superadmin/auth/initialize"
$body = @{
    secretKey = $jwtSecret
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body $body
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Superadmin account initialized:" -ForegroundColor Cyan
    Write-Host "  📧 Email: $($response.email)" -ForegroundColor White
    Write-Host "  🔑 Password: $($response.password)" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  $($response.warning)" -ForegroundColor Yellow
    Write-Host "💡 $($response.note)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now log in with these credentials." -ForegroundColor Green
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($errorDetails -and $errorDetails.error) {
        Write-Host "  $($errorDetails.error)" -ForegroundColor Red
    } else {
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. The backend URL is correct" -ForegroundColor Gray
    Write-Host "  2. The backend is running and accessible" -ForegroundColor Gray
    Write-Host "  3. JWT_SECRET matches your Railway environment variable" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Current BACKEND_URL: $backendUrl" -ForegroundColor Gray
    exit 1
}