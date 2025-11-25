import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

/**
 * Generate a unique listing code in format: EB-0001, EB-0002, etc.
 * Finds the highest existing code number and increments it
 * @returns {Promise<string>} Unique listing code
 */
export async function generateListingCode() {
    try {
        // Get all listings with codes starting with "EB-"
        const listings = await prisma.listing.findMany({
            where: {
                code: {
                    startsWith: 'EB-'
                }
            },
            select: {
                code: true
            }
        });

        let nextNumber = 1;

        // Find the highest number from codes matching the pattern EB-####
        for (const listing of listings) {
            const match = listing.code.match(/^EB-(\d+)$/);
            if (match) {
                const number = parseInt(match[1], 10);
                if (number >= nextNumber) {
                    nextNumber = number + 1;
                }
            }
        }

        // Format as EB-0001, EB-0002, etc. (4 digits, zero-padded)
        return `EB-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error('[Code Generator] Error generating code:', error);
        // Fallback to timestamp-based code if database query fails
        const timestamp = Date.now();
        return `EB-${String(timestamp).slice(-4)}`;
    }
}

/**
 * Calculate days since a given date
 * @param {Date} date - The date to calculate from
 * @returns {number} Number of days
 */
export function calculateDaysSince(date) {
    if (!date) return null;
    const now = new Date();
    const diffTime = Math.abs(now - new Date(date));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}
