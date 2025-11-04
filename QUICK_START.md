# Quick Start - First Steps

## Right Now (Before Connecting)

1. ✅ Your SSH config is ready (`production-server`)
2. ✅ Project files are updated for production
3. ⏳ Next: Connect to server

## Step 1: Connect to Server in Cursor

1. Press `Ctrl+Shift+P`
2. Type: `Remote-SSH: Connect to Host`
3. Select: `production-server`
4. Wait for connection (new window opens)

## Step 2: Once Connected

Tell me: **"I'm connected"** and I'll help you:

1. **Update the system** (first command)
2. **Install Node.js**
3. **Install Docker**
4. **Install Caddy**
5. **Install PM2**
6. **Clone your repository**
7. **Set up environment files**

## What You'll Need Ready

- Your GitHub repository URL (for cloning)
- A password for PostgreSQL (I'll help you set it up)
- Your production domain name (or IP address)
- Azure AD credentials (if you have them)

## First Command I'll Run

Once connected, the first thing we'll do is update the system:
```bash
sudo apt update && sudo apt upgrade -y
```

Then install essential tools:
```bash
sudo apt install -y build-essential curl wget git software-properties-common ca-certificates
```

**Ready?** → Connect to your server now, then tell me when you're connected!

