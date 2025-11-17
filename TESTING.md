# Testing Guide

This document describes the testing infrastructure and how to run tests for the Timekeeping Portal application.

## Testing Stack

- **Jest** - Unit and integration tests
- **Playwright** - End-to-end tests
- **Node Mocks HTTP** - API route testing

## Running Tests

### Unit Tests

Run all unit tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

### End-to-End Tests

Run E2E tests:
```bash
npm run test:e2e
```

Run E2E tests with UI:
```bash
npm run test:e2e:ui
```

## Test Structure

```
├── lib/
│   ├── analytics/
│   │   └── __tests__/
│   │       └── service.test.ts
│   ├── auth/
│   │   └── __tests__/
│   │       └── authorization.test.ts
│   └── storage/
│       └── __tests__/
│           ├── local-adapter.test.ts
│           └── storage.test.ts
├── tests/
│   └── api/
│       └── quotes.test.ts
└── e2e/
    └── smoke.spec.ts
```

## Unit Tests

Unit tests are located in `__tests__` directories next to the code they test. They focus on testing individual functions and classes in isolation.

### Example: Service Layer Test

```typescript
import { AnalyticsService } from '../service'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    timeEntry: {
      findMany: jest.fn(),
    },
  },
}))

describe('AnalyticsService', () => {
  it('should calculate total hours correctly', async () => {
    // Test implementation
  })
})
```

### Example: Authorization Test

```typescript
import { authorize } from '../authorization'

describe('Authorization', () => {
  it('should allow ADMIN to read users', () => {
    const user = { id: '1', role: 'ADMIN' }
    expect(authorize(user, 'read', 'user')).toBe(true)
  })
})
```

## Integration Tests

Integration tests are located in `tests/api/` and test API endpoints with mocked dependencies.

### Example: API Route Test

```typescript
import { GET } from '@/app/api/quotes/route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma')
jest.mock('next-auth')

describe('Quotes API', () => {
  it('should return list of quotes', async () => {
    // Test implementation
  })
})
```

## End-to-End Tests

E2E tests are located in `e2e/` and test the application from a user's perspective.

### Example: Smoke Test

```typescript
import { test, expect } from '@playwright/test'

test('should load the home page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Timekeeping Portal/i)
})
```

## Test Coverage

The project aims for at least 50% code coverage across:
- Branches
- Functions
- Lines
- Statements

View coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The CI workflow:
1. Sets up PostgreSQL database
2. Installs dependencies
3. Generates Prisma Client
4. Runs migrations
5. Runs linter
6. Runs unit tests with coverage
7. Builds application
8. Runs E2E tests

## Writing Tests

### Best Practices

1. **Test one thing at a time** - Each test should verify a single behavior
2. **Use descriptive names** - Test names should clearly describe what they test
3. **Arrange-Act-Assert** - Structure tests with setup, execution, and verification
4. **Mock external dependencies** - Mock database, API calls, and external services
5. **Clean up after tests** - Reset mocks and clean up test data

### Unit Test Template

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  it('should do something', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = functionToTest(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

### API Test Template

```typescript
describe('API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Setup mocks
  })

  it('should handle request correctly', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/endpoint')

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

### E2E Test Template

```typescript
test('should perform user action', async ({ page }) => {
  // Navigate
  await page.goto('/page')

  // Interact
  await page.click('button')

  // Verify
  await expect(page.locator('.result')).toBeVisible()
})
```

## Mocking

### Prisma

Mock Prisma client for database operations:

```typescript
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))
```

### Next-Auth

Mock authentication:

```typescript
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// In test
const { getServerSession } = require('next-auth')
getServerSession.mockResolvedValue({
  user: { id: '1', role: 'ADMIN' },
})
```

### Next.js Router

Router is automatically mocked in `jest.setup.js`:

```typescript
// Already configured, no need to mock manually
```

## Environment Variables

Tests use the following environment variables (set in `jest.setup.js`):

- `NEXTAUTH_SECRET` - Test secret for NextAuth
- `NEXTAUTH_URL` - Test URL for NextAuth
- `DATABASE_URL` - Test database URL

## Troubleshooting

### Tests failing with database errors

Ensure PostgreSQL is running and `DATABASE_URL` is set correctly.

### Tests failing with authentication errors

Check that `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set in test environment.

### E2E tests timing out

Increase timeout in `playwright.config.ts` or check that the dev server is running.

### Coverage not generating

Ensure `--coverage` flag is used or run `npm run test:coverage`.

## Continuous Improvement

- Add tests for new features
- Increase coverage for existing code
- Add E2E tests for critical user flows
- Review and update tests when refactoring

