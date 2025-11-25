import { prisma } from '@/lib/prisma'

/**
 * Generate a unique listing code in format: EB-0001, EB-0002, etc.
 * Finds the highest existing code number and increments it
 */
export async function generateListingCode(): Promise<string> {
  try {
    // Get all listings with codes starting with "EB-"
    const listings = await prisma.ebayListing.findMany({
      where: {
        code: {
          startsWith: 'EB-'
        }
      },
      select: {
        code: true
      }
    })

    let nextNumber = 1

    // Find the highest number from codes matching the pattern EB-####
    for (const listing of listings) {
      const match = listing.code.match(/^EB-(\d+)$/)
      if (match) {
        const number = parseInt(match[1], 10)
        if (number >= nextNumber) {
          nextNumber = number + 1
        }
      }
    }

    // Format as EB-0001, EB-0002, etc. (4 digits, zero-padded)
    return `EB-${String(nextNumber).padStart(4, '0')}`
  } catch (error) {
    console.error('[Code Generator] Error generating code:', error)
    // Fallback to timestamp-based code if database query fails
    const timestamp = Date.now()
    return `EB-${String(timestamp).slice(-4)}`
  }
}

/**
 * Calculate days since a given date
 */
export function calculateDaysSince(date: Date | string | null): number | null {
  if (!date) return null
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - new Date(date).getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}


