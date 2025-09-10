# PowerShell script for Windows
# Group AutoPoster Bot - Windows Setup

Write-Host "🤖 Group AutoPoster Bot - Windows Setup" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "📁 Working directory: $projectRoot" -ForegroundColor Blue

# Create directories
$dirs = @("ssl", "uploads", "uploads\media", "uploads\payments")
foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created directory: $dir" -ForegroundColor Green
    }
}

# Generate SSL certificate if not exists
if (!(Test-Path "ssl\cert.pem")) {
    Write-Host "🔐 Generating SSL certificate..." -ForegroundColor Yellow
    try {
        & openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl\key.pem -out ssl\cert.pem -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=AutoPoster/CN=localhost" 2>$null
        Write-Host "✅ SSL certificate generated" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  OpenSSL not found. Using Docker to generate certificate..." -ForegroundColor Yellow
        docker run --rm -v ${PWD}/ssl:/ssl alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /ssl/key.pem -out /ssl/cert.pem -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=AutoPoster/CN=localhost"
        Write-Host "✅ SSL certificate generated via Docker" -ForegroundColor Green
    }
}

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down --remove-orphans 2>$null | Out-Null

# Start services
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose up -d --build

# Wait for services
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Check if services are running
$services = @("autoposter_postgres", "autoposter_redis", "autoposter_app", "autoposter_nginx")
$allRunning = $true

foreach ($service in $services) {
    try {
        $status = docker ps --filter "name=$service" --format "{{.Status}}"
        if ($status -like "*Up*") {
            Write-Host "✅ $service is running" -ForegroundColor Green
        } else {
            Write-Host "❌ $service is not running" -ForegroundColor Red
            $allRunning = $false
        }
    } catch {
        Write-Host "❌ Failed to check $service status" -ForegroundColor Red
        $allRunning = $false
    }
}

if ($allRunning) {
    # Set webhook
    Write-Host "🔗 Setting up Telegram webhook..." -ForegroundColor Yellow
    $botToken = "8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q"
    $webhookUrl = "https://localhost/webhook"
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setWebhook" -Method Post -Body @{url=$webhookUrl} -ContentType "application/json"
        if ($response.ok) {
            Write-Host "✅ Telegram webhook configured successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Webhook configuration warning: $($response.description)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Failed to set webhook. You can set it manually later." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Access Points:" -ForegroundColor Cyan
    Write-Host "   🌐 Main App: https://localhost" -ForegroundColor White
    Write-Host "   🔧 Admin Panel: https://localhost/admin.html" -ForegroundColor White
    Write-Host "   📱 Mini-App: https://localhost/webapp" -ForegroundColor White
    Write-Host ""
    Write-Host "🔐 Admin Credentials:" -ForegroundColor Cyan
    Write-Host "   Username: admin" -ForegroundColor White
    Write-Host "   Password: admin123" -ForegroundColor White
    Write-Host ""
    Write-Host "🤖 Bot Token: $botToken" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Management Commands:" -ForegroundColor Cyan
    Write-Host "   View logs: docker-compose logs -f" -ForegroundColor White
    Write-Host "   Restart: docker-compose restart" -ForegroundColor White
    Write-Host "   Stop: docker-compose down" -ForegroundColor White
    Write-Host ""
    
    # Open browser
    Write-Host "🌐 Opening browser..." -ForegroundColor Yellow
    Start-Process "https://localhost"
    
} else {
    Write-Host ""
    Write-Host "❌ Some services failed to start. Check the logs:" -ForegroundColor Red
    Write-Host "docker-compose logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host