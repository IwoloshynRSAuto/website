#!/bin/bash
# Script to check DNS resolution and proceed with SSL setup

DOMAIN="portal.rsautomation.net"
EXPECTED_IP="172.208.88.5"

echo "🔍 Checking DNS resolution for $DOMAIN..."
echo ""

# Check if DNS resolves
RESOLVED_IP=$(dig $DOMAIN +short 2>/dev/null | head -1)

if [ -z "$RESOLVED_IP" ]; then
    echo "❌ DNS not resolving yet for $DOMAIN"
    echo ""
    echo "Please configure DNS first:"
    echo "  1. Add A record: portal → $EXPECTED_IP"
    echo "  2. Wait 5-15 minutes for propagation"
    echo "  3. Run this script again"
    exit 1
fi

echo "✅ DNS is resolving: $DOMAIN → $RESOLVED_IP"
echo ""

if [ "$RESOLVED_IP" != "$EXPECTED_IP" ]; then
    echo "⚠️  Warning: DNS resolves to $RESOLVED_IP but expected $EXPECTED_IP"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 Proceeding with SSL setup..."
echo ""

# Update Caddyfile
echo "📝 Updating Caddyfile..."
sudo bash -c "cat > /etc/caddy/Caddyfile << EOF
$DOMAIN {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
EOF"

# Validate Caddyfile
echo "✅ Validating Caddyfile..."
sudo caddy validate --config /etc/caddy/Caddyfile

if [ $? -ne 0 ]; then
    echo "❌ Caddyfile validation failed!"
    exit 1
fi

# Reload Caddy
echo "🔄 Reloading Caddy (will auto-get SSL certificate)..."
sudo systemctl reload caddy

# Wait a moment
sleep 3

# Check Caddy status
echo ""
echo "📊 Caddy status:"
sudo systemctl status caddy --no-pager | head -10

echo ""
echo "✅ Caddy reloaded. SSL certificate should be obtained automatically."
echo ""
echo "📋 Next steps:"
echo "  1. Update .env.production: NEXTAUTH_URL=\"https://$DOMAIN\""
echo "  2. Rebuild: npm run build"
echo "  3. Restart: pm2 restart timekeeping-prod"
echo "  4. Add Azure AD redirect URI: https://$DOMAIN/api/auth/callback/azure-ad"
echo ""
echo "🔍 Check SSL certificate logs:"
echo "   sudo journalctl -u caddy -f"


