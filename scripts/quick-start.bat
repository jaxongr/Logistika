@echo off
title Group AutoPoster Bot - Quick Start

echo.
echo 🤖 Group AutoPoster Bot - Quick Start
echo =====================================
echo.

:: Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo ✅ Docker is running

:: Create directories
if not exist "ssl" mkdir ssl
if not exist "uploads" mkdir uploads
if not exist "uploads\media" mkdir uploads\media  
if not exist "uploads\payments" mkdir uploads\payments

echo ✅ Directories created

:: Generate SSL certificate if not exists
if not exist "ssl\cert.pem" (
    echo 🔐 Generating SSL certificate...
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl\key.pem -out ssl\cert.pem -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=AutoPoster/CN=localhost"
    echo ✅ SSL certificate generated
)

:: Stop existing containers
echo 🛑 Stopping existing containers...
docker-compose down >nul 2>&1

:: Start services
echo 🚀 Starting services...
docker-compose up -d --build

:: Wait for database
echo ⏳ Waiting for database...
timeout /t 15 /nobreak >nul

:: Set up webhook
echo 🔗 Setting up Telegram webhook...
curl -s -X POST "https://api.telegram.org/bot8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q/setWebhook" -H "Content-Type: application/json" -d "{\"url\": \"https://localhost/webhook\"}" >nul

echo.
echo 🎉 Setup completed!
echo.
echo 📍 Access Points:
echo    🌐 Main App: https://localhost
echo    🔧 Admin Panel: https://localhost/admin.html
echo    📱 Mini-App: https://localhost/webapp
echo.
echo 🔐 Admin Login:
echo    Username: admin
echo    Password: admin123
echo.
echo 🤖 Bot Token: 8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q
echo.
echo 📊 To view logs: docker-compose logs -f
echo 🛑 To stop: docker-compose down
echo.

:: Open browser
start https://localhost

echo Press any key to exit...
pause >nul