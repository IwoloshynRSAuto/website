#!/bin/bash
# Start Prisma Studio for database management
# Accessible at http://172.208.88.5:5555 (or your server IP)

cd /opt/timekeeping-portal

# Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

echo "🚀 Starting Prisma Studio..."
echo "📊 Database: automation_firm_db"
echo "🌐 Access at: http://172.208.88.5:5555"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npx prisma studio --port 5555 --hostname 0.0.0.0

