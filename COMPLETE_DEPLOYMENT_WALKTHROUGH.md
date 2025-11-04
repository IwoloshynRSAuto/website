# Complete Deployment Walkthrough

This guide walks you through **everything** from pushing your code to GitHub to running it on your Ubuntu server.

---

## Part 1: Prepare & Push Code to GitHub

### Step 1.1: Check What's Changed

Open a terminal in Cursor (or your project folder) and run:

```bash
git status
```

This shows what files have been modified.

### Step 1.2: Stage All Changes

Add all your changes (including the new files we created):

```bash
git add .
```

This stages:
- Updated `.gitignore`
- Updated `prisma/schema.prisma`
- Updated `next.config.js`
- Updated `docker-compose.yml`
- New template files (`env.production.template`, etc.)
- New documentation files

### Step 1.3: Commit Changes

```bash
git commit -m "Prepare for production deployment: Update Prisma to PostgreSQL, add deployment configs"
```

### Step 1.4: Push to GitHub

```bash
git push origin main
```

(Or `git push origin master` if your default branch is `master`)

**Verify**: Go to GitHub.com and check that your repository has the latest changes.

---

## Part 2: Connect to Your Server

### Step 2.1: Connect via Remote-SSH in Cursor

1. In Cursor, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Remote-SSH: Connect to Host`
3. Select: `production-server`
4. Wait for connection (new window opens)
5. You should see "SSH: production-server" in bottom-left corner

### Step 2.2: Open Project Folder on Server

Once connected:
1. File → Open Folder
2. Navigate to `/opt` (or where you want to install)
3. Click "OK" (we'll clone into a subfolder)

---

## Part 3: Install Prerequisites on Server

### Step 3.1: Update System

In the terminal (connected to server), run:

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3.2: Install Essential Tools

```bash
sudo apt install -y build-essential curl wget git software-properties-common ca-certificates
```

### Step 3.3: Install Node.js 20.x LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:
```bash
node --version
npm --version
```

You should see Node.js v20.x.x

### Step 3.4: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify
docker --version
docker compose version
```

**Note**: You may need to log out and back in (or restart) for docker group to take effect.

### Step 3.5: Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
sudo systemctl enable caddy
sudo systemctl start caddy
```

### Step 3.6: Install PM2

```bash
sudo npm install -g pm2
```

Then set up PM2 to start on boot:
```bash
pm2 startup systemd
```

**Follow the instructions** it outputs (it will give you a command to run with sudo).

### Step 3.7: Configure Firewall

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Part 4: Clone Your Repository

### Step 4.1: Create Directory

```bash
sudo mkdir -p /opt/timekeeping-portal
sudo chown $USER:$USER /opt/timekeeping-portal
cd /opt/timekeeping-portal
```

### Step 4.2: Clone from GitHub

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git .
```

**Replace with your actual GitHub URL**. For example:
```bash
git clone https://github.com/iwoloshyn/timekeeping-portal.git .
```

If your repo is private, you may need to:
- Use SSH: `git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git .`
- Or authenticate with GitHub CLI/personal access token

### Step 4.3: Verify Clone

```bash
ls -la
```

You should see your project files.

---

## Part 5: Set Up Environment Files

### Step 5.1: Create Docker Environment File

```bash
cp env.docker.template .env.docker
nano .env.docker
```

Edit it to set a secure password:
```
POSTGRES_USER=afp
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_DB=automation_firm_db
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 5.2: Create Production Environment File

```bash
cp env.production.template .env.production
nano .env.production
```

Update these critical values:

1. **DATABASE_URL** - Use the password from `.env.docker`:
   ```
   DATABASE_URL="postgresql://afp:YourSecurePassword123!@localhost:5432/automation_firm_db"
   ```

2. **NEXTAUTH_URL** - Your production domain or IP:
   ```
   NEXTAUTH_URL="https://your-domain.com"
   ```
   Or if using IP:
   ```
   NEXTAUTH_URL="https://10.0.0.5"
   ```

3. **NEXTAUTH_SECRET** - Generate a secure random string:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and paste it as the value.

4. **Azure AD Credentials** - Update with your actual values:
   ```
   MICROSOFT_CLIENT_ID="your-actual-client-id"
   MICROSOFT_CLIENT_SECRET="your-actual-secret"
   MICROSOFT_TENANT_ID="your-actual-tenant-id"
   ```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Part 6: Start PostgreSQL Database

### Step 6.1: Start PostgreSQL Container

```bash
docker compose --env-file .env.docker up -d postgres
```

### Step 6.2: Verify PostgreSQL is Running

```bash
docker compose ps
```

You should see `afp-postgres` with status "Up".

### Step 6.3: Wait a Few Seconds

Give PostgreSQL time to initialize:
```bash
sleep 5
```

---

## Part 7: Set Up Database

### Step 7.1: Install Dependencies

```bash
npm install
```

This installs all Node.js packages.

### Step 7.2: Generate Prisma Client

```bash
npm run db:generate
```

This creates the Prisma client based on your schema.

### Step 7.3: Run Database Migrations

You have two options:

**Option A: If you have migrations** (recommended):
```bash
npm run db:migrate
```

**Option B: If no migrations yet** (pushes schema directly):
```bash
npm run db:push
```

### Step 7.4: Verify Database Connection

Test that it works:
```bash
npm run db:studio
```

This opens Prisma Studio (optional, for verification). Press `Ctrl+C` to exit.

---

## Part 8: Build Application

### Step 8.1: Build for Production

```bash
NODE_ENV=production npm run build
```

This may take a few minutes. Wait for it to complete.

### Step 8.2: Verify Build

Check that `.next` folder was created:
```bash
ls -la .next
```

---

## Part 9: Configure Caddy

### Step 9.1: Update Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Replace the contents with (from your project's `deploy/Caddyfile`):

```
{
  # Optional: write logs to a file
  # admin off
}

# Production Environment
# Replace with your actual domain
your-domain.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

**If you don't have a domain**, use your server IP:
```
10.0.0.5 {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 9.2: Validate Caddy Configuration

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

Should show "Valid configuration" or similar.

### Step 9.3: Reload Caddy

```bash
sudo systemctl reload caddy
```

---

## Part 10: Start Application with PM2

### Step 10.1: Start Production Instance

```bash
cd /opt/timekeeping-portal
pm2 start npm --name "timekeeping-prod" -- start
```

### Step 10.2: Save PM2 Configuration

```bash
pm2 save
```

This ensures PM2 restarts your app after server reboot.

### Step 10.3: Check Status

```bash
pm2 status
```

You should see `timekeeping-prod` with status "online".

### Step 10.4: View Logs

```bash
pm2 logs timekeeping-prod
```

Press `Ctrl+C` to exit logs.

---

## Part 11: Verify Everything Works

### Step 11.1: Test Local Connection

```bash
curl http://localhost:3000
```

Should return HTML (not an error).

### Step 11.2: Check PM2 Status

```bash
pm2 status
```

Should show "online".

### Step 11.3: Check Caddy Logs

```bash
sudo journalctl -u caddy -n 50 --no-pager
```

### Step 11.4: Access Your Application

Open your browser and go to:
- `https://your-domain.com` (if using domain)
- `https://10.0.0.5` (if using IP)

You may need to accept a self-signed certificate warning if Caddy hasn't set up Let's Encrypt yet.

---

## Part 12: Optional - Sandbox Environment

If you want a separate sandbox environment:

### Step 12.1: Create Sandbox Environment

```bash
cp env.sandbox.template .env.sandbox
nano .env.sandbox
```

Update with sandbox values (different port, different database).

### Step 12.2: Create Sandbox Database

Update `.env.docker` or create separate docker-compose for sandbox.

### Step 12.3: Start Sandbox Instance

```bash
PORT=3001 pm2 start npm --name "timekeeping-sandbox" -- start
pm2 save
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs timekeeping-prod --lines 50

# Check if port is in use
sudo lsof -i :3000

# Restart application
pm2 restart timekeeping-prod
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker compose ps

# Check database connection
docker compose exec postgres psql -U afp -d automation_firm_db

# Test connection string
psql "postgresql://afp:YourPassword@localhost:5432/automation_firm_db"
```

### Caddy Not Serving

```bash
# Check Caddy status
sudo systemctl status caddy

# Check Caddy logs
sudo journalctl -u caddy -f

# Validate config
sudo caddy validate --config /etc/caddy/Caddyfile
```

---

## Quick Reference Commands

```bash
# View application logs
pm2 logs timekeeping-prod

# Restart application
pm2 restart timekeeping-prod

# Stop application
pm2 stop timekeeping-prod

# View PM2 status
pm2 status

# Check database
docker compose ps

# Restart database
docker compose restart postgres

# Rebuild after code changes
git pull
npm install
npm run db:generate
npm run build
pm2 restart timekeeping-prod
```

---

## Summary Checklist

- [ ] Pushed code to GitHub
- [ ] Connected to server via Remote-SSH
- [ ] Installed Node.js, Docker, Caddy, PM2
- [ ] Cloned repository
- [ ] Created `.env.docker` and `.env.production`
- [ ] Started PostgreSQL
- [ ] Ran database migrations
- [ ] Built application
- [ ] Configured Caddy
- [ ] Started application with PM2
- [ ] Verified everything works

---

**You're done!** 🎉

Your application should now be running on your server. If you need help with any step, just ask!

