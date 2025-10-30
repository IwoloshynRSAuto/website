import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty',
    datasources: {
      db: { url: process.env.DATABASE_URL }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 250
): Promise<T> {
  let attempt = 0
  let lastError: unknown
  while (attempt < maxAttempts) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      attempt += 1
      const isTransient = isTransientDbError(error)
      if (!isTransient || attempt >= maxAttempts) break
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError as Error
}

function isTransientDbError(error: unknown): boolean {
  const message = String((error as Error)?.message ?? '')
  return (
    message.includes('P1001') || // Cannot reach database server
    message.includes('P1008') || // Transaction API error
    message.includes('P1009') || // Database already exists / not found race
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    message.includes('Connection terminated unexpectedly')
  )
}


