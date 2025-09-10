# Simple PowerShell script for Group AutoPoster Bot
Write-Host "🤖 Group AutoPoster Bot - Simple Start" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if Docker is available
try {
    docker --version | Out-Null
    Write-Host "✅ Docker found" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker not found. Install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Create required directories
Write-Host "📁 Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "ssl" -Force | Out-Null
New-Item -ItemType Directory -Path "uploads" -Force | Out-Null
New-Item -ItemType Directory -Path "uploads\media" -Force | Out-Null
New-Item -ItemType Directory -Path "uploads\payments" -Force | Out-Null

# Generate SSL certificate using Docker
Write-Host "🔐 Generating SSL certificate..." -ForegroundColor Yellow
if (!(Test-Path "ssl\cert.pem")) {
    docker run --rm -v ${PWD}/ssl:/certs alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/key.pem -out /certs/cert.pem -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=AutoPoster/CN=localhost" 2>$null
    Write-Host "✅ SSL certificate created" -ForegroundColor Green
}

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null | Out-Null

# Start containers
Write-Host "🚀 Starting containers..." -ForegroundColor Yellow
docker-compose up -d --build

# Wait for services
Write-Host "⏳ Waiting 20 seconds for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Set webhook
Write-Host "🔗 Setting webhook..." -ForegroundColor Yellow
try {
    $body = @{ url = "https://localhost/webhook" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q/setWebhook" -Method Post -Body $body -ContentType "application/json"
    
    if ($response.ok) {
        Write-Host "✅ Webhook configured" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️  Webhook setup failed - can be set manually later" -ForegroundColor Yellow
}

# Show results
Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access URLs:" -ForegroundColor Cyan
Write-Host "  🌐 Main: https://localhost" -ForegroundColor White
Write-Host "  🔧 Admin: https://localhost/admin.html" -ForegroundColor White
Write-Host "  📱 Mini-App: https://localhost/webapp" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Admin Login:" -ForegroundColor Cyan
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""

# Open browser
Write-Host "🌐 Opening browser..." -ForegroundColor Yellow
Start-Process "https://localhost"

Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host