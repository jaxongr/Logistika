#!/bin/bash

# Complete setup script for Group AutoPoster Bot

set -e

echo "🤖 Group AutoPoster Bot Setup"
echo "============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p ssl
mkdir -p uploads/media
mkdir -p uploads/payments

# Generate SSL certificate for HTTPS
if [ ! -f ssl/cert.pem ]; then
    echo "🔐 Generating SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=AutoPoster/OU=Bot/CN=localhost"
    echo "✅ SSL certificate generated"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Pull images and build
echo "📦 Building application..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to initialize..."
sleep 15

# Install dependencies and run migrations
echo "📊 Setting up database..."
docker-compose exec -T app npm install --production
docker-compose exec -T app npm run build

# Check if migration files exist, if not create initial migration
echo "🔄 Running database migrations..."
docker-compose exec -T app npm run migration:run 2>/dev/null || {
    echo "📝 Creating initial database schema..."
    docker-compose exec -T app npx typeorm-ts-node-commonjs schema:sync -d src/database/database.config.ts
}

# Set webhook for Telegram bot
echo "🔗 Setting up Telegram webhook..."
BOT_TOKEN="8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q"
WEBHOOK_URL="https://localhost/webhook"

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WEBHOOK_URL}\"}" > webhook_response.json

if grep -q '"ok":true' webhook_response.json; then
    echo "✅ Telegram webhook configured successfully"
else
    echo "⚠️  Webhook configuration failed. You may need to set it manually."
    echo "   Run: curl -X POST \"https://api.telegram.org/bot${BOT_TOKEN}/setWebhook\" -d \"url=${WEBHOOK_URL}\""
fi
rm -f webhook_response.json

# Check service health
echo "🏥 Checking service health..."
sleep 5

# Show container status
docker-compose ps

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📍 Access Points:"
echo "   🌐 Main App: https://localhost"
echo "   🔧 Admin Panel: https://localhost/admin.html"
echo "   📱 Mini-App: https://localhost/webapp"
echo "   🔗 Webhook: https://localhost/webhook"
echo ""
echo "🔐 Admin Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🤖 Bot Information:"
echo "   Token: ${BOT_TOKEN}"
echo "   Webhook: ${WEBHOOK_URL}"
echo ""
echo "📊 Monitoring:"
echo "   View logs: docker-compose logs -f"
echo "   Restart: docker-compose restart"
echo "   Stop: docker-compose down"
echo ""
echo "⚠️  Note: This setup uses self-signed SSL certificates."
echo "   For production, replace with real SSL certificates."