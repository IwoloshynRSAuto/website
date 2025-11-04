# Production Deployment Guide

This guide walks you through deploying the Timekeeping Portal to your Ubuntu 22.04 server.

## Prerequisites

- Ubuntu 22.04 server with SSH access
- Domain name (optional, can use IP address)
- Azure AD app registration configured

## Step 1: Server Preparation

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl wget git software-properties-common ca-certificates
```

### 1.2 Install Node.js (LTS 20.x)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verify installation
```

### 1.3 Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

### 1.4 Install Caddy
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
sudo systemctl enable caddy
sudo systemctl start caddy
```

### 1.5 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 startup systemd
# Follow the instructions it outputs
```

### 1.6 Configure Firewall
```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Step 2: Deploy Application

### 2.1 Clone Repository
```bash
cd /opt  # or your preferred directory
sudo mkdir -p timekeeping-portal
sudo chown $USER:$USER timekeeping-portal
git clone <your-repo-url> timekeeping-portal
cd timekeeping-portal
```

### 2.2 Install Dependencies
```bash
npm install
```

### 2.3 Configure Environment Variables

Create production environment file:
```bash
cp env.production.template .env.production
nano .env.production  # Edit with your values
```

**Critical values to update:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your production domain
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- Azure AD credentials

Create sandbox environment (optional):
```bash
cp env.sandbox.template .env.sandbox
nano .env.sandbox  # Edit with your values
```

### 2.4 Configure Docker Compose
```bash
cp env.docker.template .env.docker
nano .env.docker  # Set secure PostgreSQL password
```

## Step 3: Database Setup

### 3.1 Start PostgreSQL
```bash
docker compose --env-file .env.docker up -d postgres
```

Wait a few seconds for PostgreSQL to start, then verify:
```bash
docker compose ps
```

### 3.2 Run Database Migrations
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Or if migrations don't exist yet, push schema
npm run db:push
```

### 3.3 Verify Database Connection
```bash
npm run db:studio  # Opens Prisma Studio (optional, for verification)
```

## Step 4: Build Application

### 4.1 Build for Production
```bash
NODE_ENV=production npm run build
```

Verify the build succeeded (check for `.next` directory).

## Step 5: Configure Caddy

### 5.1 Update Caddyfile
```bash
sudo nano /etc/caddy/Caddyfile
```

Copy contents from `deploy/Caddyfile` and update with your domain:
```
your-domain.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

### 5.2 Test Caddy Configuration
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

### 5.3 Reload Caddy
```bash
sudo systemctl reload caddy
```

## Step 6: Start Application with PM2

### 6.1 Start Production Instance
```bash
cd /opt/timekeeping-portal
pm2 start npm --name "timekeeping-prod" -- start
pm2 save
```

### 6.2 Start Sandbox Instance (Optional)
```bash
pm2 start npm --name "timekeeping-sandbox" -- \
  --env-file .env.sandbox \
  -- PORT=3001 start
pm2 save
```

### 6.3 Monitor Applications
```bash
pm2 status
pm2 logs timekeeping-prod
pm2 logs timekeeping-sandbox
```

## Step 7: Verify Deployment

1. Check application is running:
   ```bash
   curl http://localhost:3000
   ```

2. Check PM2 status:
   ```bash
   pm2 status
   ```

3. Check Caddy logs:
   ```bash
   sudo journalctl -u caddy -f
   ```

4. Access your domain in a browser

## Troubleshooting

### Application won't start
- Check PM2 logs: `pm2 logs timekeeping-prod`
- Verify environment variables are set correctly
- Check database connection: `docker compose ps`

### Database connection errors
- Verify PostgreSQL is running: `docker compose ps`
- Check DATABASE_URL in .env.production
- Test connection: `psql $DATABASE_URL`

### Caddy not serving
- Check Caddy status: `sudo systemctl status caddy`
- Validate config: `sudo caddy validate --config /etc/caddy/Caddyfile`
- Check logs: `sudo journalctl -u caddy -n 50`

### Port conflicts
- Check what's using port 3000: `sudo lsof -i :3000`
- Update Caddyfile if using different port

## Maintenance

### Update Application
```bash
cd /opt/timekeeping-portal
git pull
npm install
npm run db:generate
npm run build
pm2 restart timekeeping-prod
```

### Backup Database
```bash
docker compose exec postgres pg_dump -U afp automation_firm_db > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
docker compose exec -T postgres psql -U afp automation_firm_db < backup_file.sql
```

## Security Notes

1. **Change default passwords** - Update all default passwords in .env files
2. **Firewall** - Only expose necessary ports (22, 80, 443)
3. **SSL** - Caddy automatically handles SSL certificates via Let's Encrypt
4. **Database** - Consider restricting PostgreSQL to localhost only
5. **Secrets** - Never commit .env files to git

