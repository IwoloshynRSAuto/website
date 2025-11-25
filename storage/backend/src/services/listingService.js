import { PrismaClient } from '@prisma/client';
import { generateListingCode, calculateDaysSince } from '../utils/codeGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Handle Prisma connection errors
prisma.$connect().catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});

/**
 * Create a new listing with generated code
 * userId is optional for single-user systems
 */
export async function createListing(userId, data) {
    // Generate unique sequential code
    const code = await generateListingCode();

    const listing = await prisma.listing.create({
        data: {
            code,
            userId: userId || null, // Optional for single-user system
            status: 'draft',
            ...data
        },
        include: {
            storageLocation: true,
            condition: true,
            category: true,
            images: true
        }
    });

    return listing;
}

/**
 * Get all listings with filters and pagination
 */
export async function getListings(filters = {}, options = {}) {
    const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const where = {};

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.search) {
        where.OR = [
            { code: { contains: filters.search, mode: 'insensitive' } },
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
        ];
    }

    if (filters.storageLocationId) {
        where.storageLocationId = parseInt(filters.storageLocationId);
    }

    if (filters.conditionId) {
        where.conditionId = parseInt(filters.conditionId);
    }

    const [listings, total] = await Promise.all([
        prisma.listing.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                storageLocation: true,
                condition: true,
                category: true,
                images: { orderBy: { order: 'asc' } },
                ebayData: true,
                aiAnalysis: true,
                alerts: { where: { isActive: true } },
                _count: {
                    select: { alerts: { where: { isActive: true } } }
                }
            }
        }),
        prisma.listing.count({ where })
    ]);

    // Calculate days since created/posted for each listing
    const listingsWithDays = listings.map(listing => ({
        ...listing,
        daysSincePosted: listing.postedDate ? calculateDaysSince(listing.postedDate) : null,
        daysSinceCreated: calculateDaysSince(listing.createdAt)
    }));

    return {
        listings: listingsWithDays,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get a single listing by ID
 */
export async function getListingById(id) {
    const listing = await prisma.listing.findUnique({
        where: { id: parseInt(id) },
        include: {
            storageLocation: true,
            condition: true,
            category: true,
            images: { orderBy: { order: 'asc' } },
            ebayData: true,
            aiAnalysis: true,
            alerts: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
            priceHistory: { orderBy: { createdAt: 'desc' }, take: 20 }
        }
    });

    if (!listing) {
        throw new Error('Listing not found');
    }

    listing.daysSincePosted = listing.postedDate ? calculateDaysSince(listing.postedDate) : null;
    listing.daysSinceCreated = calculateDaysSince(listing.createdAt);

    return listing;
}

/**
 * Update a listing
 */
export async function updateListing(id, data) {
    const listing = await prisma.listing.findUnique({
        where: { id: parseInt(id) }
    });

    if (!listing) {
        throw new Error('Listing not found');
    }

    // Track price changes
    if (data.currentPrice && data.currentPrice !== listing.currentPrice) {
        await prisma.priceHistory.create({
            data: {
                listingId: listing.id,
                price: data.currentPrice,
                changeReason: data.priceChangeReason || 'Manual update'
            }
        });
    }

    const updated = await prisma.listing.update({
        where: { id: parseInt(id) },
        data,
        include: {
            storageLocation: true,
            condition: true,
            category: true,
            images: { orderBy: { order: 'asc' } },
            ebayData: true,
            aiAnalysis: true,
            alerts: { where: { isActive: true } }
        }
    });

    return updated;
}

/**
 * Delete a listing
 */
export async function deleteListing(id) {
    const listingId = parseInt(id);

    // Check if listing exists and get images before deletion
    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { images: true }
    });

    if (!listing) {
        throw new Error('Listing not found');
    }

    // Get list of image filenames before deletion
    const imageFilenames = listing.images.map(img => img.filename);

    // Delete in transaction to ensure all related data is removed
    await prisma.$transaction(async (tx) => {
        // Delete related records first (if cascade is not working)
        await tx.alert.deleteMany({ where: { listingId } });
        await tx.aIAnalysis.deleteMany({ where: { listingId } });
        await tx.ebayData.deleteMany({ where: { listingId } });
        await tx.priceHistory.deleteMany({ where: { listingId } });
        await tx.listingImage.deleteMany({ where: { listingId } });

        // Finally delete the listing
        await tx.listing.delete({ where: { id: listingId } });
    });

    // Delete actual image files from the uploads folder
    for (const filename of imageFilenames) {
        const filePath = path.join(uploadsDir, filename);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[Delete] Deleted image file: ${filename}`);
            } else {
                console.warn(`[Delete] Image file not found: ${filename}`);
            }
        } catch (error) {
            console.error(`[Delete] Error deleting image file ${filename}:`, error);
            // Don't throw - continue deleting other files even if one fails
        }
    }

    return { message: 'Listing deleted successfully' };
}

/**
 * Generate alerts for a listing based on age and condition
 */
export async function generateAlertsForListing(listingId) {
    const listing = await getListingById(listingId);

    // Clear existing alerts
    await prisma.alert.updateMany({
        where: { listingId: listing.id },
        data: { isActive: false }
    });

    const alerts = [];

    // Age alert (100+ days since created or posted)
    const daysSinceCreated = calculateDaysSince(listing.createdAt);
    const daysSincePosted = listing.postedDate ? calculateDaysSince(listing.postedDate) : null;
    const daysSince = daysSincePosted || daysSinceCreated;
    
    if (daysSince && daysSince >= 100) {
        const markdownPercent = Math.min(15, Math.floor((daysSince - 100) / 10) * 2);
        alerts.push({
            listingId: listing.id,
            type: 'age',
            severity: 'warning',
            message: `Listing is ${daysSince} days old`,
            suggestedAction: `Consider ${markdownPercent}% price reduction`
        });
    }

    // Needs inspection alert
    if (listing.needsInspection) {
        alerts.push({
            listingId: listing.id,
            type: 'inspection',
            severity: 'error',
            message: 'Item needs inspection',
            suggestedAction: 'Inspect item and update condition'
        });
    }

    // Needs testing alert
    if (listing.needsTesting) {
        alerts.push({
            listingId: listing.id,
            type: 'testing',
            severity: 'error',
            message: 'Item needs testing',
            suggestedAction: 'Test item functionality and update condition'
        });
    }

    // Condition alerts
    const needsAttention = ['needs_testing', 'for_parts', 'needs_inspection'];
    if (listing.condition && needsAttention.includes(listing.condition.code)) {
        alerts.push({
            listingId: listing.id,
            type: 'condition',
            severity: 'error',
            message: `Item condition: ${listing.condition.name}`,
            suggestedAction: 'Review and update item condition'
        });
    }

    // Missing data alert
    if (!listing.title || !listing.description || !listing.currentPrice) {
        alerts.push({
            listingId: listing.id,
            type: 'missing_data',
            severity: 'warning',
            message: 'Listing has missing required data',
            suggestedAction: 'Complete all required fields'
        });
    }

    // Create alerts
    if (alerts.length > 0) {
        await prisma.alert.createMany({
            data: alerts
        });
    }

    return alerts;
}

/**
 * Get dashboard statistics
 * userId is optional for single-user systems
 */
export async function getDashboardStats(userId) {
    // Single user system - count all listings if no userId provided
    const whereClause = userId ? { userId } : {};
    const listingWhereClause = userId ? { userId } : {};
    
    const [total, active, sold, draft, alertCount] = await Promise.all([
        prisma.listing.count({ where: whereClause }),
        prisma.listing.count({ where: { ...whereClause, status: 'active' } }),
        prisma.listing.count({ where: { ...whereClause, status: 'sold' } }),
        prisma.listing.count({ where: { ...whereClause, status: 'draft' } }),
        prisma.alert.count({
            where: {
                isActive: true,
                listing: listingWhereClause
            }
        })
    ]);

    return {
        total,
        active,
        sold,
        draft,
        alerts: alertCount
    };
}

export default {
    createListing,
    getListings,
    getListingById,
    updateListing,
    deleteListing,
    generateAlertsForListing,
    getDashboardStats
};
