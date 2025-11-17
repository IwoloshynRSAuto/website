# Troubleshooting Guide

Common issues and solutions for the Timekeeping Portal refactoring.

## Installation Issues

### Dependencies Not Installing

**Problem:** `npm install` fails or dependencies are missing.

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check Node.js version (requires 20+)
node --version

# Verify npm version
npm --version
```

### Prisma Client Generation Fails

**Problem:** `npm run db:generate` fails.

**Solutions:**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Verify Prisma schema is valid
npx prisma validate

# Regenerate from scratch
rm -rf node_modules/.prisma
npm run db:generate
```

## Database Issues

### Migration Fails

**Problem:** `npm run db:migrate` fails.

**Solutions:**
```bash
# Check database connection
npx prisma db pull

# Reset database (development only!)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Apply migrations manually
npx prisma migrate deploy
```

### Connection Errors

**Problem:** Cannot connect to database.

**Solutions:**
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running: `pg_isready`
- Verify network connectivity
- Check firewall rules
- Verify credentials

### Schema Validation Errors

**Problem:** Prisma schema has errors.

**Solutions:**
```bash
# Validate schema
npx prisma validate

# Format schema
npx prisma format

# Check for syntax errors
npx prisma generate --schema=./prisma/schema.prisma
```

## API Issues

### 401 Unauthorized

**Problem:** API returns 401 Unauthorized.

**Solutions:**
- Verify session exists: Check cookies
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Verify Azure AD credentials
- Check session expiration

### 403 Forbidden

**Problem:** API returns 403 Forbidden.

**Solutions:**
- Check user role in database
- Verify authorization capability
- Check `authorize()` function call
- Review role capability map in `lib/auth/authorization.ts`
- Verify user has required permissions

### 500 Internal Server Error

**Problem:** API returns 500 error.

**Solutions:**
- Check server logs for error details
- Verify database connection
- Check Prisma query syntax
- Verify environment variables
- Check service layer logic

### API Not Found (404)

**Problem:** API endpoint returns 404.

**Solutions:**
- Verify route file exists: `app/api/{module}/route.ts`
- Check route path matches URL
- Verify Next.js routing structure
- Check for typos in route path
- Restart dev server

## Storage Issues

### File Upload Fails

**Problem:** Cannot upload files.

**Solutions:**
- Check storage adapter configuration
- Verify `STORAGE_ADAPTER` is set (local or s3)
- For local: Check `STORAGE_BASE_PATH` exists and is writable
- For S3: Verify credentials and bucket exists
- Check file size limits
- Verify file permissions

### File Not Found

**Problem:** Cannot access uploaded files.

**Solutions:**
- Check FileRecord exists in database
- Verify storage path is correct
- Check file exists in storage location
- Verify signed URL generation (S3)
- Check file permissions

### S3 Connection Issues

**Problem:** Cannot connect to S3.

**Solutions:**
- Verify `S3_ENDPOINT` is correct
- Check `S3_KEY` and `S3_SECRET` are valid
- Verify `S3_BUCKET` exists
- Check network connectivity
- Verify S3 region is correct
- Check IAM permissions

## Authorization Issues

### User Cannot Access Resource

**Problem:** User gets forbidden error.

**Solutions:**
- Check user role in database
- Verify role capability in `lib/auth/authorization.ts`
- Check if resource requires ownership
- Verify `authorize()` or `authorizeOwnResource()` call
- Check session is valid

### Role Not Working

**Problem:** Role changes not taking effect.

**Solutions:**
- Verify role in database: `SELECT role FROM users WHERE id = ?`
- Check NextAuth session refresh
- Sign out and sign back in
- Verify role mapping (USER → TECHNICIAN, MANAGER → PROJECT_MANAGER)
- Check authorization helper is used

## Testing Issues

### Tests Fail

**Problem:** `npm test` fails.

**Solutions:**
```bash
# Clear Jest cache
npm test -- --clearCache

# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test -- path/to/test.ts

# Check test environment
npm test -- --showConfig
```

### E2E Tests Fail

**Problem:** `npm run test:e2e` fails.

**Solutions:**
```bash
# Install Playwright browsers
npx playwright install --with-deps

# Run with UI
npm run test:e2e:ui

# Check if dev server is running
# Playwright should start it automatically

# Verify base URL
# Check playwright.config.ts
```

### Coverage Too Low

**Problem:** Test coverage below threshold.

**Solutions:**
- Add more unit tests
- Add integration tests
- Check coverage report: `npm run test:coverage`
- Review uncovered code
- Adjust threshold in `jest.config.js` if needed

## Build Issues

### Build Fails

**Problem:** `npm run build` fails.

**Solutions:**
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npm run lint

# Clear Next.js cache
rm -rf .next
npm run build

# Check environment variables
# Some may be required at build time
```

### Type Errors

**Problem:** TypeScript compilation errors.

**Solutions:**
- Check import paths use `@/` alias
- Verify types are imported correctly
- Check `tsconfig.json` paths
- Verify Prisma Client is generated
- Check for missing type definitions

## Module-Specific Issues

### Quotes Module

**Problem:** Cannot create/update quotes.

**Solutions:**
- Verify `QuoteService` is imported correctly
- Check Zod schema validation
- Verify customer exists
- Check quote status transitions
- Review API route implementation

### Jobs Module

**Problem:** Cannot convert quote to job.

**Solutions:**
- Verify quote exists and is in correct status
- Check quote has required data
- Verify job creation logic
- Check for missing required fields
- Review conversion service

### Analytics Module

**Problem:** Analytics return no data.

**Solutions:**
- Verify data exists in database
- Check date filters are correct
- Verify Prisma queries
- Check for null/undefined values
- Review service layer logic

### Timekeeping Module

**Problem:** Cannot submit time-off/expenses.

**Solutions:**
- Verify user exists
- Check required fields are provided
- Verify date ranges are valid
- Check approval workflow
- Review service layer validation

## Environment Variables

### Missing Variables

**Problem:** Application fails due to missing env vars.

**Solutions:**
- Check `.env` file exists
- Verify all required variables are set
- Check `.env.example` for reference
- Verify variable names are correct
- Check for typos in variable names

### Wrong Values

**Problem:** Application works but with wrong configuration.

**Solutions:**
- Verify `DATABASE_URL` format
- Check `NEXTAUTH_URL` matches your domain
- Verify Azure AD credentials
- Check storage configuration
- Review environment-specific values

## Performance Issues

### Slow API Responses

**Problem:** API endpoints are slow.

**Solutions:**
- Check database query performance
- Add database indexes
- Review Prisma query optimization
- Check for N+1 queries
- Verify connection pooling
- Review service layer logic

### High Memory Usage

**Problem:** Application uses too much memory.

**Solutions:**
- Check for memory leaks
- Review large data queries
- Verify pagination is used
- Check for circular references
- Review file upload handling

## CI/CD Issues

### CI Pipeline Fails

**Problem:** GitHub Actions workflow fails.

**Solutions:**
- Check workflow logs
- Verify environment variables in CI
- Check database service is running
- Verify test dependencies
- Check for flaky tests
- Review workflow configuration

### Tests Fail in CI

**Problem:** Tests pass locally but fail in CI.

**Solutions:**
- Check environment differences
- Verify database setup in CI
- Check for timing issues
- Verify test isolation
- Check for missing dependencies
- Review CI environment variables

## Common Error Messages

### "Module not found"

**Solution:** Check import paths, verify file exists, check `tsconfig.json` paths.

### "Cannot read property of undefined"

**Solution:** Add null checks, verify data structure, check Prisma includes.

### "Prisma Client not generated"

**Solution:** Run `npm run db:generate`, check Prisma schema is valid.

### "Unauthorized" or "Forbidden"

**Solution:** Check authentication, verify authorization, review role capabilities.

### "Database connection failed"

**Solution:** Verify `DATABASE_URL`, check PostgreSQL is running, verify network.

## Getting Help

### Check Documentation
1. Review relevant PR summary
2. Check [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
3. Review [Testing Guide](./TESTING.md)
4. Check [Quick Reference](./QUICK_REFERENCE.md)

### Debug Steps
1. Check server logs
2. Review browser console
3. Verify environment variables
4. Check database state
5. Review API responses
6. Test with curl/Postman

### Common Commands

```bash
# Check logs
npm run dev  # Watch for errors

# Database
npm run db:studio  # Visual database browser

# Testing
npm test -- --verbose  # Detailed test output

# Type checking
npx tsc --noEmit  # Check types without building
```

## Still Stuck?

1. **Review Error Messages** - Check full error stack trace
2. **Check Logs** - Review server and browser console logs
3. **Verify Configuration** - Check all environment variables
4. **Test Isolation** - Test individual components
5. **Review Documentation** - Check relevant guides
6. **Check Issues** - Review similar issues in codebase

## Prevention

### Best Practices
- Always validate input data
- Use TypeScript for type safety
- Write tests for critical paths
- Document complex logic
- Use error handling consistently
- Monitor application logs
- Keep dependencies updated
- Review code before merging

---

**Need more help?** Check the [Documentation Index](./DOCUMENTATION_INDEX.md) for comprehensive guides.

