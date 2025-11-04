#!/bin/bash
# Helper script to set up production environment files
# Usage: ./scripts/setup-env-production.sh

set -e

echo "🚀 Setting up production environment files..."
echo ""

# Check if .env.docker exists
if [ ! -f ".env.docker" ]; then
    echo "📝 Creating .env.docker from template..."
    cp env.docker.template .env.docker
    echo "⚠️  Please edit .env.docker and set a secure PostgreSQL password"
    echo "   Run: nano .env.docker"
    echo ""
    read -p "Press Enter after you've updated .env.docker..."
fi

# Read values from .env.docker
source .env.docker

# Check if .env.production exists
if [ -f ".env.production" ]; then
    echo "⚠️  .env.production already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Keeping existing .env.production"
        exit 1
    fi
fi

# Create .env.production from template
echo "📝 Creating .env.production from template..."
cp env.production.template .env.production

# Update DATABASE_URL with values from .env.docker
echo "🔧 Updating DATABASE_URL..."
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"
sed -i "s|DATABASE_URL=\".*\"|DATABASE_URL=\"${DATABASE_URL}\"|" .env.production

echo "✅ DATABASE_URL has been set to:"
echo "   ${DATABASE_URL}"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env.production to set:"
echo "      - NEXTAUTH_URL (your production domain)"
echo "      - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
echo "      - Azure AD credentials"
echo ""
echo "   2. Start PostgreSQL:"
echo "      docker compose --env-file .env.docker up -d postgres"
echo ""
echo "   3. Run database migrations:"
echo "      npm run db:generate"
echo "      npm run db:push"
echo ""

