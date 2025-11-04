# Deployment Workflow - Visual Guide

## What Does This Look Like?

### Overview
```
Your Local Machine              GitHub                 Ubuntu Server
     │                            │                         │
     │                            │                         │
     │─── Push code ──────────────>│                         │
     │                            │                         │
     │                            │<─── Clone repo ──────────│
     │                            │                         │
     │                            │      SSH via Cursor     │
     │<────────────────────────────┼─────────────────────────│
     │                            │                         │
     │  (You can edit files       │                         │
     │   on server through        │                         │
     │   Cursor's Remote-SSH)    │                         │
     │                            │                         │
```

## Step-by-Step Process

### 1. On Your Local Machine (Windows)

You have your code, you make changes, you commit and push:
```bash
git add .
git commit -m "Updated for production"
git push origin main
```

### 2. On the Server (Ubuntu)

#### A. Clone the Repository
```bash
cd /opt
git clone https://github.com/your-username/your-repo.git timekeeping-portal
cd timekeeping-portal
```

#### B. Install Dependencies
```bash
npm install
```

### 3. Setting Up Environment Variables (The Key Part)

#### Option A: Using Cursor with Remote - SSH (Easiest) ⭐

1. **In Cursor, connect to your server:**
   - Press `Ctrl+Shift+P`
   - Type "Remote-SSH: Connect to Host"
   - Select your server (e.g., "production-server")

2. **Open the project folder on the server:**
   - File → Open Folder
   - Navigate to `/opt/timekeeping-portal`

3. **Now I can help you!** 🎉
   - You can ask me: "Update DATABASE_URL with password XYZ123"
   - I can edit `.env.production` directly on the server
   - I can create `.env.docker` for you
   - I can run commands through the terminal

**Example conversation:**
```
You: "I want to use password 'MySecurePass123!' for PostgreSQL"
Me: I'll update both .env.docker and .env.production for you
You: "What's my DATABASE_URL now?"
Me: postgresql://afp:MySecurePass123!@localhost:5432/automation_firm_db
```

#### Option B: Manual Setup

**Step 1: Create `.env.docker`**
```bash
cd /opt/timekeeping-portal
cp env.docker.template .env.docker
nano .env.docker
```

Edit to:
```
POSTGRES_USER=afp
POSTGRES_PASSWORD=MySecurePass123!
POSTGRES_DB=automation_firm_db
```

**Step 2: Create `.env.production`**
```bash
cp env.production.template .env.production
nano .env.production
```

Find this line:
```
DATABASE_URL="postgresql://afp:CHANGE_THIS_PASSWORD@localhost:5432/automation_firm_db"
```

Change it to:
```
DATABASE_URL="postgresql://afp:MySecurePass123!@localhost:5432/automation_firm_db"
```

**Note:** The password must match what you set in `.env.docker`!

### 4. Start PostgreSQL

```bash
docker compose --env-file .env.docker up -d postgres
```

This starts PostgreSQL using the credentials from `.env.docker`.

### 5. Your App Connects to Database

When your app runs, it reads `.env.production` and uses:
```
DATABASE_URL="postgresql://afp:MySecurePass123!@localhost:5432/automation_firm_db"
```

This connects to the PostgreSQL container that's running with the same credentials.

## How I Can Help When SSH'd via Cursor

### ✅ What I CAN Do:

1. **Edit files on the server** - I can read and modify `.env.production`, `.env.docker`, etc.
2. **Run terminal commands** - I can execute commands on the server
3. **Create/update configuration** - I can set up files based on your input
4. **Troubleshoot issues** - I can check logs, test connections, etc.

### Example Workflow:

**You (in Cursor, connected to server):**
```
"Set up the database with password 'SecurePass456'"
```

**Me:**
1. I'll read the templates
2. Create `.env.docker` with your password
3. Create `.env.production` with matching DATABASE_URL
4. Show you the connection string

**You:**
```
"Now start PostgreSQL"
```

**Me:**
1. I'll run: `docker compose --env-file .env.docker up -d postgres`
2. Verify it started
3. Show you the status

## Visual Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Clone Repo on Server                                  │
│    git clone ... → /opt/timekeeping-portal              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Create .env.docker                                    │
│    POSTGRES_PASSWORD=YourPassword123!                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Create .env.production                                │
│    DATABASE_URL="postgresql://afp:YourPassword123!@..." │
│    (password matches .env.docker)                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Start PostgreSQL                                      │
│    docker compose --env-file .env.docker up -d postgres  │
│    (uses password from .env.docker)                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Start Your App                                        │
│    npm start                                             │
│    (connects using DATABASE_URL from .env.production)    │
└─────────────────────────────────────────────────────────┘
```

## Quick Reference

### The Two Files You Need:

1. **`.env.docker`** - For Docker Compose
   ```
   POSTGRES_USER=afp
   POSTGRES_PASSWORD=YourPasswordHere
   POSTGRES_DB=automation_firm_db
   ```

2. **`.env.production`** - For Your App
   ```
   DATABASE_URL="postgresql://afp:YourPasswordHere@localhost:5432/automation_firm_db"
   ```

**Key Point:** The password in both files must be identical!

## Summary

**Yes, when you SSH into the server via Cursor's Remote - SSH:**
- ✅ I can edit files on the server
- ✅ I can run commands on the server  
- ✅ I can set up your DATABASE_URL automatically
- ✅ Just provide me the password and I'll configure everything

**The workflow:**
1. Clone repo on server
2. Connect via Remote - SSH in Cursor
3. Tell me: "Set up DATABASE_URL with password XYZ"
4. I'll configure both `.env.docker` and `.env.production`
5. You run: `docker compose up -d postgres`
6. Done! ✅

