import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import listingService from '../services/listingService.js';
import aiService from '../services/aiService.js';
import pricingService from '../services/pricingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Configure multer for image uploads
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('[Upload] Created uploads directory:', uploadsDir);
    }
} catch (error) {
    console.error('[Upload] Error creating uploads directory:', error);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `images-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
        }
    }
});

/**
 * POST /api/listings
 * Create a new listing
 */
router.post('/', async (req, res, next) => {
    try {
        console.log('[POST /api/listings] Request received:', {
            body: req.body,
            origin: req.headers.origin,
            ip: req.ip
        });

        const { storageLocationId, conditionId, categoryId, metadata, userId } = req.body;

        // Single user system - userId is optional, default to 1
        let userIdToUse = userId || 1;
        
        // Ensure default user exists
        let defaultUser = await prisma.user.findUnique({ where: { id: userIdToUse } });
        if (!defaultUser) {
            defaultUser = await prisma.user.create({
                data: {
                    id: userIdToUse,
                    email: 'default@example.com',
                    passwordHash: 'default_hash',
                    name: 'Default User'
                }
            });
        }

        const listing = await listingService.createListing(userIdToUse, {
            storageLocationId: storageLocationId ? parseInt(storageLocationId) : null,
            conditionId: conditionId ? parseInt(conditionId) : null,
            categoryId: categoryId ? parseInt(categoryId) : null,
            metadata
        });

        console.log('[POST /api/listings] Listing created successfully:', listing.id);
        res.status(201).json({ success: true, data: listing });
    } catch (error) {
        console.error('[POST /api/listings] Error creating listing:', error);
        // Provide more detailed error information
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                success: false, 
                error: 'Listing code already exists. Please try again.' 
            });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid reference (location, condition, or category does not exist)' 
            });
        }
        next(error);
    }
});

/**
 * GET /api/listings
 * Get all listings with filtering and pagination
 */
router.get('/', async (req, res, next) => {
    try {
        // Single user system - no userId filtering needed
        const filters = {
            status: req.query.status,
            search: req.query.search,
            storageLocationId: req.query.storageLocationId,
            conditionId: req.query.conditionId
        };

        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50,
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'desc'
        };

        const result = await listingService.getListings(filters, options);

        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/listings/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        // Single user system - no userId needed
        const stats = await listingService.getDashboardStats(null);

        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/listings/:id
 * Get a single listing by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const listing = await listingService.getListingById(req.params.id);
        res.json({ success: true, data: listing });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/listings/:id
 * Update a listing
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { title, description, currentPrice, status, storageLocationId, conditionId, categoryId, priceChangeReason } = req.body;

        const updated = await listingService.updateListing(req.params.id, {
            title,
            description,
            currentPrice: currentPrice ? parseFloat(currentPrice) : undefined,
            status,
            storageLocationId: storageLocationId ? parseInt(storageLocationId) : undefined,
            conditionId: conditionId ? parseInt(conditionId) : undefined,
            categoryId: categoryId ? parseInt(categoryId) : undefined,
            priceChangeReason
        });

        // Regenerate alerts
        await listingService.generateAlertsForListing(updated.id);

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/listings/:id
 * Delete a listing
 */
router.delete('/:id', async (req, res, next) => {
    try {
        await listingService.deleteListing(req.params.id);
        res.json({ success: true, message: 'Listing deleted successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/listings/:id/images
 * Upload images for a listing and trigger AI analysis
 */
router.post('/:id/images', (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
        if (err) {
            console.error('[Upload] Multer error:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'File too large. Maximum size is 10MB.' 
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Too many files. Maximum is 10 images.' 
                    });
                }
            }
            return res.status(400).json({ 
                success: false, 
                error: err.message || 'File upload error' 
            });
        }
        next();
    });
}, async (req, res, next) => {
    try {
        const listingId = parseInt(req.params.id);

        console.log('[Upload] Received request for listing:', listingId);
        console.log('[Upload] Files received:', req.files?.length || 0);

        if (!req.files || req.files.length === 0) {
            console.error('[Upload] No files in request');
            return res.status(400).json({ success: false, error: 'No images uploaded' });
        }

        // Save images to database
        const imagePromises = req.files.map((file, index) => {
            return prisma.listingImage.create({
                data: {
                    listingId,
                    filename: file.filename,
                    url: `/uploads/${file.filename}`,
                    order: index
                }
            });
        });

        const images = await Promise.all(imagePromises);

        // Trigger AI analysis
        try {
            const imagePaths = req.files.map(file => file.path);
            const result = await aiService.analyzeImages(imagePaths, listingId);
            const analysis = result.analysis;

            // Save AI analysis
            await prisma.aIAnalysis.upsert({
                where: { listingId },
                create: {
                    listingId,
                    detectedBrand: analysis.brand || null,
                    detectedModel: analysis.model || null,
                    autoDescription: analysis.description || null,
                    itemSpecifics: analysis.itemSpecifics || null,
                    suggestedCategory: analysis.category || null,
                    confidenceScore: analysis.confidenceScore || 0.5
                },
                update: {
                    detectedBrand: analysis.brand || null,
                    detectedModel: analysis.model || null,
                    autoDescription: analysis.description || null,
                    itemSpecifics: analysis.itemSpecifics || null,
                    suggestedCategory: analysis.category || null,
                    confidenceScore: analysis.confidenceScore || 0.5
                }
            });

            if (result.cost) {
                console.log(`[AI] Analysis cost: $${result.cost.cost.toFixed(4)} (${result.cost.totalDailyCost.toFixed(2)} total today)`);
            }

            // Update listing with AI data (title and description)
            await prisma.listing.update({
                where: { id: listingId },
                data: {
                    ...(analysis.title && { title: analysis.title }),
                    ...(analysis.description && { description: analysis.description })
                }
            });

            // Automatically generate pricing suggestions after AI analysis
            let pricing = null;
            try {
                const listing = await listingService.getListingById(listingId);
                pricing = await pricingService.generatePricingSuggestions(listing);
                
                // Save pricing to listing
                await prisma.listing.update({
                    where: { id: listingId },
                    data: {
                        suggestedPrice: pricing.suggestedPrice,
                        suggestedAuctionPrice: pricing.auctionStartPrice,
                        suggestedShipping: pricing.suggestedShipping,
                        currentPrice: listing.currentPrice || pricing.suggestedPrice
                    }
                });
            } catch (pricingError) {
                console.error('Auto-pricing failed:', pricingError);
                // Don't fail the request if pricing fails
            }

            res.json({
                success: true,
                data: {
                    images,
                    analysis,
                    pricing
                }
            });
        } catch (aiError) {
            console.error('AI Analysis failed:', aiError);
            // Still return images even if AI fails
            res.json({
                success: true,
                data: {
                    images,
                    analysis: null,
                    aiError: aiError.message
                }
            });
        }
    } catch (error) {
        console.error('[Upload] Error in upload handler:', error);
        // Handle multer errors specifically
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'File too large. Maximum size is 10MB.' 
                });
            }
            if (error.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Too many files. Maximum is 10 images.' 
                });
            }
        }
        next(error);
    }
});

/**
 * POST /api/listings/:id/pricing
 * Generate pricing suggestions for a listing and save to listing
 */
router.post('/:id/pricing', async (req, res, next) => {
    try {
        const listing = await listingService.getListingById(req.params.id);
        const pricing = await pricingService.generatePricingSuggestions(listing);

        // Save pricing suggestions to listing
        await prisma.listing.update({
            where: { id: listing.id },
            data: {
                suggestedPrice: pricing.suggestedPrice,
                suggestedAuctionPrice: pricing.auctionStartPrice,
                suggestedShipping: pricing.suggestedShipping,
                // Update currentPrice if not set
                ...(listing.currentPrice === null && { currentPrice: pricing.suggestedPrice })
            }
        });

        res.json({ success: true, data: pricing });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/listings/:id/alerts
 * Generate alerts for a listing
 */
router.post('/:id/alerts', async (req, res, next) => {
    try {
        const alerts = await listingService.generateAlertsForListing(parseInt(req.params.id));
        res.json({ success: true, data: alerts });
    } catch (error) {
        next(error);
    }
});

export default router;
