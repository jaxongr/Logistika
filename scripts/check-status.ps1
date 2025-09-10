# Check project status
Write-Host "🔍 Group AutoPoster Bot - Status Check" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Check Docker
try {
    docker --version
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
    exit 1
}

# Check containers
Write-Host ""
Write-Host "📦 Container Status:" -ForegroundColor Cyan
docker-compose ps

# Check if services are accessible
Write-Host ""
Write-Host "🌐 Service Health Check:" -ForegroundColor Cyan

# Check if nginx is responding
try {
    $response = Invoke-WebRequest -Uri "https://localhost" -SkipCertificateCheck -TimeoutSec 5 2>$null
    Write-Host "✅ HTTPS (Port 443): Accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ HTTPS (Port 443): Not accessible" -ForegroundColor Red
}

# Check if app is responding directly
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 2>$null
    Write-Host "✅ App (Port 3000): Accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ App (Port 3000): Not accessible" -ForegroundColor Red
}

# Check database
try {
    docker-compose exec -T postgres pg_isready -U postgres | Out-Null
    Write-Host "✅ PostgreSQL: Ready" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL: Not ready" -ForegroundColor Red
}

# Check Redis
try {
    $redisCheck = docker-compose exec -T redis redis-cli ping 2>$null
    if ($redisCheck -eq "PONG") {
        Write-Host "✅ Redis: Ready" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis: Not ready" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Redis: Not ready" -ForegroundColor Red
}

# Check webhook status
Write-Host ""
Write-Host "🤖 Telegram Webhook Status:" -ForegroundColor Cyan
$botToken = "8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q"
try {
    $webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/getWebhookInfo"
    if ($webhookInfo.result.url) {
        Write-Host "✅ Webhook URL: $($webhookInfo.result.url)" -ForegroundColor Green
        Write-Host "📊 Pending updates: $($webhookInfo.result.pending_update_count)" -ForegroundColor Blue
    } else {
        Write-Host "❌ No webhook configured" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to check webhook status" -ForegroundColor Red
}

Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   🌐 Main App: https://localhost" -ForegroundColor White
Write-Host "   🔧 Admin Panel: https://localhost/admin.html" -ForegroundColor White
Write-Host "   📱 Mini-App: https://localhost/webapp" -ForegroundColor White

Write-Host ""
Read-Host "Press Enter to exit"