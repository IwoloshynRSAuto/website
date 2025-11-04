# .gitignore Explanation

## What Should NOT Be Committed (Ignored)

### 🔴 Critical - Never Commit These

1. **Environment Files** (`.env`, `.env.production`, `.env.sandbox`, `.env.docker`)
   - Contains secrets, passwords, API keys
   - **Why**: Security risk if exposed
   - **What to commit instead**: Templates (`.env.*.template`, `env.example`)

2. **Database Files** (`*.db`, `prisma/dev.db`)
   - Local development databases
   - **Why**: Large binary files, not needed in repo
   - **What to commit**: Schema (`schema.prisma`) and migrations (`prisma/migrations/`)

3. **SSL Certificates** (`certs/*.pem`, `certs/*.pfx`)
   - Private keys and certificates
   - **Why**: Security risk
   - **What to commit**: Nothing certificate-related

4. **Node Modules** (`node_modules/`)
   - Dependencies installed via npm
   - **Why**: Large, can be regenerated with `npm install`
   - **What to commit**: `package.json` and `package-lock.json`

5. **Build Output** (`.next/`, `out/`, `build/`)
   - Compiled/generated files
   - **Why**: Can be regenerated, large files
   - **What to commit**: Source code only

### ⚠️ Important - Should Not Be Committed

6. **Uploads/User Content** (`uploads/`, `storage/uploads/`)
   - User-uploaded files
   - **Why**: Large, user-specific, not code
   - **What to commit**: Directory structure (empty folders)

7. **Log Files** (`*.log`, `logs/`)
   - Application logs
   - **Why**: Large, change frequently, not code
   - **What to commit**: Nothing

8. **IDE Settings** (`.vscode/`, `.idea/`)
   - Editor-specific configurations
   - **Why**: Personal preferences, not project code
   - **What to commit**: Nothing (or team-shared configs if agreed)

9. **PM2 Config** (`pm2.config.js`, `.pm2/`)
   - Process manager configuration
   - **Why**: Server-specific, may contain secrets
   - **What to commit**: Nothing (or template if needed)

10. **Temporary Files** (`*.tmp`, `*.cache`, `.temp/`)
    - Build artifacts, cache
    - **Why**: Temporary, regenerated
    - **What to commit**: Nothing

## What SHOULD Be Committed ✅

### Must Commit

1. **Source Code** (`app/`, `components/`, `lib/`, `scripts/`)
2. **Configuration Files**:
   - `package.json` & `package-lock.json`
   - `next.config.js`
   - `tsconfig.json`
   - `tailwind.config.js`
   - `docker-compose.yml`
   - `prisma/schema.prisma`

3. **Templates** (Safe to commit):
   - `env.example`
   - `env.production.template`
   - `env.sandbox.template`
   - `env.docker.template`

4. **Database Migrations**: `prisma/migrations/`

5. **Documentation**: `*.md` files (README, guides, etc.)

6. **Deployment Configs**: `deploy/Caddyfile` (template)

## Quick Checklist

Before committing, verify:

- [ ] No `.env` files (except templates)
- [ ] No `*.db` files
- [ ] No `certs/*.pem` or `*.pfx` files
- [ ] No `node_modules/` folder
- [ ] No `.next/` build folder
- [ ] No `uploads/` or user content
- [ ] No `*.log` files
- [ ] No secrets or passwords in any file

## How to Verify

```bash
# Check what files are being tracked
git status

# Check for accidentally tracked sensitive files
git ls-files | grep -E '\.(env|db|pem|pfx)$'

# If you find sensitive files, remove them:
git rm --cached .env.production
git rm --cached prisma/dev.db
# Then commit the removal
```

## Common Mistakes to Avoid

❌ **Don't commit**:
- `.env.production` with real passwords
- `env.docker` with real passwords
- `prisma/dev.db` (local database)
- SSL certificates in `certs/`
- `node_modules/` folder

✅ **Do commit**:
- `env.production.template` (no real values)
- `env.docker.template` (no real values)
- `prisma/schema.prisma` (database structure)
- `prisma/migrations/` (migration files)

## If You Accidentally Committed Secrets

1. **Immediately rotate/change the secrets** (passwords, API keys)
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.production" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (if already pushed to remote):
   ```bash
   git push origin --force --all
   ```
4. Update `.gitignore` to prevent future commits

