# Production Deployment Checklist

Use this checklist when deploying to your Ubuntu 22.04 server.

## Pre-Deployment Changes (Already Completed ✅)

- [x] Updated Prisma schema to use PostgreSQL
- [x] Cleaned up next.config.js (removed dev IPs)
- [x] Updated docker-compose.yml with environment variables
- [x] Created environment file templates
- [x] Updated Caddyfile with production structure

## Server Setup

- [ ] SSH into server
- [ ] Update system packages
- [ ] Install Node.js 20.x LTS
- [ ] Install Docker & Docker Compose
- [ ] Install Caddy web server
- [ ] Install PM2 process manager
- [ ] Configure firewall (ports 22, 80, 443)

## Application Deployment

- [ ] Clone repository to server
- [ ] Install npm dependencies
- [ ] Copy `env.production.template` to `.env.production`
- [ ] Update `.env.production` with actual values:
  - [ ] DATABASE_URL (PostgreSQL connection string)
  - [ ] NEXTAUTH_URL (production domain)
  - [ ] NEXTAUTH_SECRET (generate: `openssl rand -base64 32`)
  - [ ] Azure AD credentials
- [ ] Copy `env.docker.template` to `.env.docker`
- [ ] Update `.env.docker` with secure PostgreSQL password
- [ ] Start PostgreSQL: `docker compose --env-file .env.docker up -d postgres`
- [ ] Generate Prisma client: `npm run db:generate`
- [ ] Run database migrations: `npm run db:migrate` or `npm run db:push`
- [ ] Build application: `NODE_ENV=production npm run build`

## Caddy Configuration

- [ ] Copy `deploy/Caddyfile` to `/etc/caddy/Caddyfile`
- [ ] Update domain in Caddyfile
- [ ] Validate Caddy config: `sudo caddy validate --config /etc/caddy/Caddyfile`
- [ ] Reload Caddy: `sudo systemctl reload caddy`

## Start Application

- [ ] Start production with PM2: `pm2 start npm --name "timekeeping-prod" -- start`
- [ ] Save PM2 config: `pm2 save`
- [ ] Verify running: `pm2 status`
- [ ] Check logs: `pm2 logs timekeeping-prod`

## Verification

- [ ] Application responds on localhost: `curl http://localhost:3000`
- [ ] Domain is accessible (check DNS if using domain)
- [ ] SSL certificate issued (Caddy auto-generates)
- [ ] Database connection working
- [ ] Azure AD authentication working

## Sandbox Setup (Optional)

- [ ] Copy `env.sandbox.template` to `.env.sandbox`
- [ ] Update `.env.sandbox` with sandbox values
- [ ] Create sandbox database
- [ ] Update Caddyfile with sandbox subdomain
- [ ] Start sandbox with PM2 on port 3001

## Security Reminders

- [ ] Changed all default passwords
- [ ] Firewall configured correctly
- [ ] .env files not committed to git
- [ ] PostgreSQL password is secure
- [ ] NEXTAUTH_SECRET is secure random string

