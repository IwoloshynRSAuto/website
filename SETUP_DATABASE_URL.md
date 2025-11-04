# Setting Up DATABASE_URL

## The Process Flow

1. **Clone repository on server** → You have the code
2. **Create `.env.docker`** → Sets PostgreSQL password for Docker
3. **Start PostgreSQL with Docker** → Database runs with those credentials
4. **Create `.env.production`** → Your app uses this to connect to the database
5. **DATABASE_URL must match** → Same username/password as `.env.docker`

## Step-by-Step: Setting Up DATABASE_URL

### Step 1: Create .env.docker (for Docker Compose)

On your server, create `.env.docker`:
```bash
POSTGRES_USER=afp
POSTGRES_PASSWORD=YourSecurePassword123!
POSTGRES_DB=automation_firm_db
```

**Example:**
```bash
cd /opt/timekeeping-portal
cp env.docker.template .env.docker
nano .env.docker
# Edit the password, save and exit
```

### Step 2: Start PostgreSQL

```bash
docker compose --env-file .env.docker up -d postgres
```

This starts PostgreSQL with:
- **Username**: `afp` (from .env.docker)
- **Password**: `YourSecurePassword123!` (from .env.docker)
- **Database**: `automation_firm_db` (from .env.docker)
- **Port**: `5432` (exposed on localhost)

### Step 3: Create .env.production (for your app)

The DATABASE_URL must use the **same credentials** as Step 1:

```bash
DATABASE_URL="postgresql://afp:YourSecurePassword123!@localhost:5432/automation_firm_db"
```

**Format breakdown:**
```
postgresql://[username]:[password]@[host]:[port]/[database]
                ↓          ↓          ↓      ↓      ↓
               afp    YourSecure   localhost 5432  automation_firm_db
                       Password
```

### Complete Example

If your `.env.docker` has:
```
POSTGRES_USER=afp
POSTGRES_PASSWORD=MySuperSecretPass456!
POSTGRES_DB=automation_firm_db
```

Then your `.env.production` should have:
```
DATABASE_URL="postgresql://afp:MySuperSecretPass456!@localhost:5432/automation_firm_db"
```

## How to Update on Server

### Option 1: Using Cursor with Remote - SSH (Recommended)

1. **Connect to server** via Remote - SSH in Cursor
2. **Open the project folder** on the server
3. **I can help you edit** `.env.production` directly
4. Just tell me what password you want to use, and I'll update it

### Option 2: Manual Editing via SSH Terminal

```bash
# SSH into server
ssh user@your-server-ip

# Navigate to project
cd /opt/timekeeping-portal

# Edit the file
nano .env.production

# Find this line:
# DATABASE_URL="postgresql://afp:CHANGE_THIS_PASSWORD@localhost:5432/automation_firm_db"

# Replace CHANGE_THIS_PASSWORD with your actual password
# Save: Ctrl+O, Enter, Ctrl+X
```

### Option 3: Using sed (Quick Command Line)

```bash
# Replace the password in one command
sed -i 's/CHANGE_THIS_PASSWORD/YourActualPassword123!/g' .env.production
```

## Verification

After setting up, test the connection:

```bash
# From the server, test database connection
npm run db:studio
# Or
psql "postgresql://afp:YourPassword@localhost:5432/automation_firm_db"
```

## Important Notes

1. **Same password everywhere**: The password in `.env.docker` must match the password in `.env.production` DATABASE_URL
2. **localhost**: Since PostgreSQL runs in Docker on the same server, use `localhost` or `127.0.0.1`
3. **Port 5432**: Default PostgreSQL port (matching docker-compose.yml)
4. **No quotes in password**: If your password has special characters, you may need to URL-encode them in DATABASE_URL

## URL Encoding Special Characters

If your password has special characters, they need to be URL-encoded:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `&` becomes `%26`

Example:
- Password: `MyP@ss#123`
- Encoded: `MyP%40ss%23123`
- DATABASE_URL: `postgresql://afp:MyP%40ss%23123@localhost:5432/automation_firm_db`

## Quick Reference

| Setting | Value | Where |
|---------|-------|-------|
| Username | `afp` | Both files |
| Password | Your choice | Both files (must match) |
| Host | `localhost` | DATABASE_URL only |
| Port | `5432` | DATABASE_URL only |
| Database | `automation_firm_db` | Both files |

