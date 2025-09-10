#!/bin/bash

# Deployment script for Group AutoPoster Bot

set -e

echo "🚀 Starting deployment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "Please create .env.production file with your production configuration"
    exit 1
fi

# Copy environment file
cp .env.production .env

# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate for development (replace with real cert for production)
if [ ! -f ssl/cert.pem ]; then
    echo "📜 Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=AutoPoster/CN=localhost"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start containers
echo "🏗️ Building and starting containers..."
docker-compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker-compose exec -T app npm run migration:run

# Check if all services are running
echo "🔍 Checking service status..."
docker-compose ps

# Show logs
echo "📝 Showing recent logs..."
docker-compose logs --tail=50

echo "✅ Deployment completed!"
echo ""
echo "🌐 Access points:"
echo "   - Main app: https://localhost"
echo "   - Admin panel: https://localhost/admin.html"
echo "   - API: https://localhost/api"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🔄 To restart services:"
echo "   docker-compose restart"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose down"