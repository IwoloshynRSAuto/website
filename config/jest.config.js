/**
 * Jest configuration for unit and integration tests
 */

const path = require('path')

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: path.join(__dirname, '..'),
})

const customJestConfig = {
  // Config file lives in config/; tests and src/ are at repo root
  rootDir: path.join(__dirname, '..'),
  setupFilesAfterEnv: [path.join(__dirname, 'jest.setup.js')],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/e2e/',
  ],
  collectCoverageFrom: [
    'src/lib/**/*.{js,jsx,ts,tsx}',
    'src/app/api/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/__tests__/**',
    '!**/e2e/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
