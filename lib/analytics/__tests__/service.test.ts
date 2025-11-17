/**
 * Unit tests for AnalyticsService
 */

import { AnalyticsService } from '../service'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    timeEntry: {
      findMany: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    quote: {
      findMany: jest.fn(),
    },
    bOM: {
      findMany: jest.fn(),
    },
  },
}))

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getHoursLogged', () => {
    it('should calculate total hours correctly', async () => {
      const mockTimeEntries = [
        {
          id: '1',
          userId: 'user1',
          regularHours: 8,
          overtimeHours: 2,
          date: new Date('2025-01-01'),
          user: { id: 'user1', name: 'User 1', email: 'user1@test.com' },
          job: { id: 'job1', jobNumber: 'J001', title: 'Job 1' },
          laborCode: { id: 'code1', code: 'ENG', description: 'Engineering' },
        },
        {
          id: '2',
          userId: 'user1',
          regularHours: 7,
          overtimeHours: 1,
          date: new Date('2025-01-02'),
          user: { id: 'user1', name: 'User 1', email: 'user1@test.com' },
          job: { id: 'job1', jobNumber: 'J001', title: 'Job 1' },
          laborCode: { id: 'code1', code: 'ENG', description: 'Engineering' },
        },
      ]

      ;(prisma.timeEntry.findMany as jest.Mock).mockResolvedValue(mockTimeEntries)

      const result = await AnalyticsService.getHoursLogged({})

      expect(result.totalRegularHours).toBe(15)
      expect(result.totalOvertimeHours).toBe(3)
      expect(result.totalHours).toBe(18)
      expect(result.totalEntries).toBe(2)
    })

    it('should filter by userId', async () => {
      ;(prisma.timeEntry.findMany as jest.Mock).mockResolvedValue([])

      await AnalyticsService.getHoursLogged({ userId: 'user1' })

      expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user1',
          }),
        })
      )
    })

    it('should filter by date range', async () => {
      ;(prisma.timeEntry.findMany as jest.Mock).mockResolvedValue([])

      await AnalyticsService.getHoursLogged({
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T23:59:59Z',
      })

      expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })
  })

  describe('getWinLossRate', () => {
    it('should calculate win rate correctly', async () => {
      const mockQuotes = [
        { id: '1', status: 'WON', amount: 10000, customerId: 'cust1', customer: { id: 'cust1', name: 'Customer 1' } },
        { id: '2', status: 'WON', amount: 20000, customerId: 'cust1', customer: { id: 'cust1', name: 'Customer 1' } },
        { id: '3', status: 'LOST', amount: 5000, customerId: 'cust2', customer: { id: 'cust2', name: 'Customer 2' } },
        { id: '4', status: 'SENT', amount: 15000, customerId: 'cust2', customer: { id: 'cust2', name: 'Customer 2' } },
      ]

      ;(prisma.quote.findMany as jest.Mock).mockResolvedValue(mockQuotes)

      const result = await AnalyticsService.getWinLossRate({})

      expect(result.total).toBe(4)
      expect(result.won).toBe(2)
      expect(result.lost).toBe(1)
      expect(result.sent).toBe(1)
      expect(result.winRate).toBe(50)
      expect(result.lossRate).toBe(25)
      expect(result.totalQuoted).toBe(50000)
      expect(result.wonValue).toBe(30000)
    })
  })
})

