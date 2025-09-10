Write-Host "Starting Group AutoPoster Bot..." -ForegroundColor Green

# Create directories
New-Item -ItemType Directory -Path "ssl" -Force | Out-Null
New-Item -ItemType Directory -Path "uploads" -Force | Out-Null  
New-Item -ItemType Directory -Path "uploads/media" -Force | Out-Null
New-Item -ItemType Directory -Path "uploads/payments" -Force | Out-Null
Write-Host "Directories created" -ForegroundColor Green

# Start Docker containers
Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker-compose down 2>$null
docker-compose up -d --build
Write-Host "Containers started" -ForegroundColor Green

# Wait for services
Write-Host "Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Set webhook
Write-Host "Setting webhook..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "https://api.telegram.org/bot8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q/setWebhook" -Method Post -Body '{"url":"https://localhost/webhook"}' -ContentType "application/json" | Out-Null
    Write-Host "Webhook configured" -ForegroundColor Green
} catch {
    Write-Host "Webhook setup failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "Main App: https://localhost" -ForegroundColor Cyan
Write-Host "Admin Panel: https://localhost/admin.html" -ForegroundColor Cyan
Write-Host "Username: admin | Password: admin123" -ForegroundColor White
Write-Host ""

# Open browser
Start-Process "https://localhost"

Read-Host "Press Enter to continue"