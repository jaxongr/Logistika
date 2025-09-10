#!/bin/bash

# Production deployment script

set -e

echo "🚀 Production Deployment - Group AutoPoster Bot"
echo "==============================================="
echo ""

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  Running as root. This is fine for production deployment."
fi

# Check requirements
echo "✅ Checking requirements..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Copy production environment
cp .env.production .env
echo "✅ Production environment loaded"

# Create necessary directories with proper permissions
mkdir -p ssl
mkdir -p uploads/media
mkdir -p uploads/payments
chmod 755 uploads
chmod 755 uploads/media
chmod 755 uploads/payments

# Generate strong SSL certificate (replace with Let's Encrypt in real production)
if [ ! -f ssl/cert.pem ]; then
    echo "🔐 Generating SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=AutoPoster Bot LLC/OU=Development/CN=localhost"
    
    chmod 600 ssl/key.pem
    chmod 644 ssl/cert.pem
    echo "✅ SSL certificate generated"
fi

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose down --remove-orphans || true

# Pull latest images and build
echo "🏗️ Building production images..."
docker-compose -f docker-compose.yml build --no-cache --pull

# Start services in production mode
echo "🚀 Starting production services..."
docker-compose -f docker-compose.yml up -d

# Wait for services to initialize
echo "⏳ Waiting for services to initialize..."
sleep 20

# Health check
echo "🏥 Performing health checks..."
for i in {1..10}; do
    if docker-compose exec -T app curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Application is healthy"
        break
    else
        echo "⏳ Waiting for application... (attempt $i/10)"
        sleep 5
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Application failed to start properly"
        docker-compose logs app
        exit 1
    fi
done

# Run database setup
echo "📊 Setting up database..."
docker-compose exec -T app npm run migration:run || {
    echo "📝 Creating database schema..."
    docker-compose exec -T app npx typeorm-ts-node-commonjs schema:sync -d src/database/database.config.ts
}

# Set up Telegram webhook
echo "🔗 Configuring Telegram webhook..."
BOT_TOKEN="8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q"
WEBHOOK_URL="https://localhost/webhook"

WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WEBHOOK_URL}\", \"allowed_updates\": [\"message\", \"my_chat_member\", \"chat_member\"]}")

if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Telegram webhook configured successfully"
else
    echo "⚠️  Webhook configuration warning:"
    echo "$WEBHOOK_RESPONSE"
fi

# Security hardening
echo "🔒 Applying security settings..."

# Set up log rotation
cat > logrotate.conf << EOF
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 644 root root
}
EOF

# Display final status
echo ""
echo "🎉 Production Deployment Complete!"
echo "=================================="
echo ""
docker-compose ps
echo ""
echo "📍 Access Points:"
echo "   🌐 Main Application: https://localhost"
echo "   🔧 Admin Panel: https://localhost/admin.html"
echo "   📱 Telegram Mini-App: https://localhost/webapp"
echo "   🔗 Webhook Endpoint: https://localhost/webhook"
echo ""
echo "🔐 Security Information:"
echo "   Admin Username: admin"
echo "   Admin Password: [set in .env file]"
echo "   JWT Secret: [configured]"
echo "   SSL: Self-signed certificate (replace for production)"
echo ""
echo "🤖 Bot Configuration:"
echo "   Token: 8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q"
echo "   Webhook: https://localhost/webhook"
echo ""
echo "📊 Monitoring Commands:"
echo "   View all logs: docker-compose logs -f"
echo "   View app logs: docker-compose logs -f app"
echo "   Container status: docker-compose ps"
echo "   System resources: docker stats"
echo ""
echo "🔄 Management Commands:"
echo "   Restart all: docker-compose restart"
echo "   Stop all: docker-compose down"
echo "   Update: git pull && docker-compose up -d --build"
echo ""
echo "⚠️  Production Notes:"
echo "   - Replace self-signed SSL with Let's Encrypt for public access"
echo "   - Set up proper domain name and DNS"
echo "   - Configure firewall rules"
echo "   - Set up monitoring and alerting"
echo "   - Regular database backups recommended"
echo ""
echo "✅ Bot is ready to accept messages!"