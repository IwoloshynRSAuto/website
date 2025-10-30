# 🚀 Local Development Setup

## ✅ Current Status

Your website is now running locally for development purposes while you configure Azure AD later.

## 🌐 Access Your Website

### Local Development (HTTP)
- **URL**: `http://localhost:3000`
- **Status**: ✅ Running
- **Authentication**: Will use localhost redirects (temporary)

### Internal Network (HTTPS) - For Later
- **URL**: `https://192.168.10.95:3000`
- **Status**: ⏸️ Paused (needs Azure AD configuration)
- **Authentication**: Will use internal domain (after Azure AD setup)

## 🛠️ Development Commands

### Start Local Development Server
```bash
npm run dev
```
- Runs on `http://localhost:3000`
- Uses HTTP (no SSL certificates needed)
- Perfect for development and testing

### Start HTTPS Server (When Ready)
```bash
npm run dev:https
```
- Runs on `https://192.168.10.95:3000`
- Requires Azure AD configuration
- For production-like testing

## 🔧 Current Configuration

### Environment Variables (Local)
```
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-here"
MICROSOFT_CLIENT_ID="your-azure-ad-app-client-id"
MICROSOFT_CLIENT_SECRET="your-azure-ad-app-client-secret"
MICROSOFT_TENANT_ID="your-tenant-id"
DATABASE_URL="file:./dev.db"
```

## 📋 What You Can Do Now

### ✅ Immediate Development
1. **Access the website**: `http://localhost:3000`
2. **Continue development**: All features work except Azure AD auth
3. **Test functionality**: Database, UI, business logic
4. **Debug issues**: No authentication blocking development

### ⏳ For Later (After Azure AD Setup)
1. **Configure Azure AD redirect URIs**:
   - `https://192.168.10.95:3000/api/auth/callback/azure-ad`
   - `https://192.168.10.95:3000`
2. **Switch to HTTPS server**: `npm run dev:https`
3. **Test production authentication**

## 🔄 Switching Between Modes

### For Local Development
```bash
# Stop current server
# Ctrl+C or taskkill /F /IM node.exe

# Start local development
npm run dev
# Access: http://localhost:3000
```

### For Production Testing
```bash
# Stop current server
# Ctrl+C or taskkill /F /IM node.exe

# Start HTTPS server
npm run dev:https
# Access: https://192.168.10.95:3000
```

## 🎯 Development Workflow

1. **Continue developing** with `npm run dev`
2. **Test features** without authentication blocking
3. **When ready for Azure AD testing**:
   - Configure Azure AD redirect URIs
   - Switch to `npm run dev:https`
   - Test authentication flow

## 📝 Notes

- **Local development** uses HTTP and localhost redirects
- **Production testing** requires HTTPS and Azure AD configuration
- **Database** works the same in both modes
- **All other features** work identically

You can now continue developing while the Azure AD configuration is pending!
