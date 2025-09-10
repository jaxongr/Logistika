#!/bin/bash

# Local development setup script

set -e

echo "🔧 Starting Local Development Environment"
echo "======================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ NPM is not installed. Please install NPM first."
    exit 1
fi

echo "✅ Node.js and NPM are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start database and redis with Docker
echo "🗄️ Starting database and Redis..."
docker-compose up -d postgres redis

# Wait for database
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
npm run migration:run || {
    echo "📝 Creating database schema..."
    npx typeorm-ts-node-commonjs schema:sync -d src/database/database.config.ts
}

# Set webhook for development
echo "🔗 Setting up development webhook..."
BOT_TOKEN="8479156569:AAEm3WzUo1d3rITQ7dDVtiSMeMZOEZdxx3Q"

# For local development, we'll remove webhook to use polling
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook" > /dev/null
echo "✅ Webhook removed for local development (using polling mode)"

echo ""
echo "🚀 Starting development server..."
echo ""
echo "📍 Access Points:"
echo "   🌐 API: http://localhost:3000"
echo "   📱 Mini-App: http://localhost:3000/public/index.html"
echo "   🔧 Admin Panel: http://localhost:3000/public/admin.html"
echo ""
echo "🔐 Admin Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""

# Start the development server
npm run start:dev