/**
 * API integration tests for quotes endpoints
 */

import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/quotes/route'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    quote: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  },
}))

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock authOptions
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

describe('Quotes API', () => {
  const mockSession = {
    user: {
      id: 'user1',
      role: 'ADMIN',
      email: 'admin@test.com',
      name: 'Admin User',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/quotes', () => {
    it('should return list of quotes', async () => {
      const mockQuotes = [
        {
          id: '1',
          quoteNumber: 'Q001',
          status: 'DRAFT',
          amount: 10000,
          customerId: 'cust1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(prisma.quote.findMany as jest.Mock).mockResolvedValue(mockQuotes)

      const request = new NextRequest('http://localhost:3000/api/quotes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
    })

    it('should return 401 if not authenticated', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/quotes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/quotes', () => {
    it('should create a new quote', async () => {
      const mockCustomer = {
        id: 'cust1',
        name: 'Customer 1',
      }

      const mockQuote = {
        id: '1',
        quoteNumber: 'Q001',
        status: 'DRAFT',
        amount: 10000,
        customerId: 'cust1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer)
      ;(prisma.quote.create as jest.Mock).mockResolvedValue(mockQuote)

      const request = new NextRequest('http://localhost:3000/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'cust1',
          amount: 10000,
          status: 'DRAFT',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
    })

    it('should return 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})

