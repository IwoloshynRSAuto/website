import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import { generateTitleFromImages } from '../services/aiTitleService.js';
import { generateListingCode } from '../utils/codeGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Base directory for listings
const listingsBaseDir = path.join(__dirname, '../../listings');

// Ensure listings base directory exists
try {
    if (!fs.existsSync(listingsBaseDir)) {
        fs.mkdirSync(listingsBaseDir, { recursive: true });
        console.log('[Listings] Created listings base directory:', listingsBaseDir);
    }
} catch (error) {
    console.error('[Listings] Error creating listings directory:', error);
}

// Temporary upload directory (files will be moved to listing folder after creation)
const tempUploadsDir = path.join(__dirname, '../../temp-uploads');

// Ensure temp uploads directory exists
try {
    if (!fs.existsSync(tempUploadsDir)) {
        fs.mkdirSync(tempUploadsDir, { recursive: true });
        console.log('[Listings] Created temp uploads directory:', tempUploadsDir);
    }
} catch (error) {
    console.error('[Listings] Error creating temp uploads directory:', error);
}

// Configure multer with disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempUploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `temp-${uniqueSuffix}${ext}`);
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
 * POST /api/listing/create
 * New workflow: Upload images → Generate listingId → Create folder → Save images → Generate title
 */
router.post('/create', upload.array('images', 10), async (req, res, next) => {
    let listingId = null;
    let listingFolderPath = null;
    
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No images provided'
            });
        }

        // Generate listing code
        const code = await generateListingCode();

        // Create listing in database first to get ID
        const listing = await prisma.listing.create({
            data: {
                code,
                title: null, // Will be set after AI generation
                listingStatus: 'draft',
                userId: 1 // Single user system
            }
        });

        listingId = listing.id;
        listingFolderPath = path.join(listingsBaseDir, listingId.toString(), 'images');

        // Create folder structure: /listings/{listingId}/images/
        try {
            if (!fs.existsSync(listingFolderPath)) {
                fs.mkdirSync(listingFolderPath, { recursive: true });
                console.log(`[Listings] Created folder: ${listingFolderPath}`);
            }
        } catch (folderError) {
            console.error('[Listings] Error creating folder:', folderError);
            throw new Error('Failed to create listing folder');
        }

        // Move uploaded files to listing folder and save to database
        const imagePaths = [];
        const savedImages = [];

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            
            // Check if file.path exists (from disk storage)
            if (!file.path) {
                console.error('[Listings] File path is undefined for file:', file.originalname);
                throw new Error(`File upload error: ${file.originalname} - path is undefined`);
            }
            
            const ext = path.extname(file.originalname);
            const newFilename = `image-${i + 1}${ext}`;
            const destinationPath = path.join(listingFolderPath, newFilename);

            // Move file from temp location to listing folder
            try {
                fs.renameSync(file.path, destinationPath);
                console.log(`[Listings] Moved file: ${file.path} -> ${destinationPath}`);
            } catch (moveError) {
                console.error('[Listings] Error moving file:', moveError);
                throw new Error(`Failed to move file ${file.originalname}: ${moveError.message}`);
            }
            
            imagePaths.push(destinationPath);

            // Save image record to database
            const imageUrl = `/listings/${listingId}/images/${newFilename}`;
            const imageRecord = await prisma.listingImage.create({
                data: {
                    listingId,
                    filename: newFilename,
                    url: imageUrl,
                    order: i
                }
            });
            savedImages.push(imageRecord);
        }

        // Update listing with folder path
        await prisma.listing.update({
            where: { id: listingId },
            data: {
                imageFolderPath: `/listings/${listingId}/images/`
            }
        });

        // Generate title using AI
        let generatedTitle = 'Product Listing';
        try {
            const titleResult = await generateTitleFromImages(imagePaths, listingId);
            generatedTitle = titleResult.title;

            // Update listing with generated title
            await prisma.listing.update({
                where: { id: listingId },
                data: {
                    title: generatedTitle
                }
            });
        } catch (aiError) {
            console.error('[Listings] AI title generation failed:', aiError);
            // Continue without title - user can add it manually
        }

        res.status(201).json({
            success: true,
            data: {
                id: listingId,
                code,
                title: generatedTitle,
                imageFolderPath: `/listings/${listingId}/images/`,
                imageCount: savedImages.length
            }
        });
    } catch (error) {
        console.error('[Listings] Error creating listing:', error);
        
        // Cleanup on error
        if (listingId) {
            try {
                // Delete listing from database (cascade will delete images)
                await prisma.listing.delete({ where: { id: listingId } });
                
                // Delete folder if it exists
                if (listingFolderPath && fs.existsSync(listingFolderPath)) {
                    fs.rmSync(listingFolderPath, { recursive: true, force: true });
                }
            } catch (cleanupError) {
                console.error('[Listings] Cleanup error:', cleanupError);
            }
        }

        // Cleanup any uploaded temp files
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                try {
                    if (file.path && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                        console.log(`[Listings] Cleaned up temp file: ${file.path}`);
                    }
                } catch (cleanupError) {
                    console.error('[Listings] Error cleaning up temp file:', cleanupError);
                }
            });
        }

        // Send proper error response
        const errorMessage = error.message || 'Failed to create listing';
        const statusCode = error.status || 500;
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
});

/**
 * POST /api/listing/update
 * Update listing metadata (location, condition, testStatus, notes)
 */
router.post('/update/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, categoryId, storageLocationId, location, condition, testStatus, notes, listingStatus } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        // Handle categoryId
        if (categoryId !== undefined && categoryId !== '') {
            updateData.categoryId = parseInt(categoryId);
        } else if (categoryId === '') {
            // Empty string means clear the category
            updateData.categoryId = null;
        }
        // Use storageLocationId if provided, otherwise fall back to location text field
        if (storageLocationId !== undefined && storageLocationId !== '') {
            updateData.storageLocationId = parseInt(storageLocationId);
        } else if (storageLocationId === '') {
            // Empty string means clear the location
            updateData.storageLocationId = null;
        }
        // Keep location text field for backward compatibility
        if (location !== undefined) updateData.location = location;
        if (condition !== undefined) updateData.conditionText = condition;
        if (testStatus !== undefined) updateData.testStatus = testStatus;
        if (notes !== undefined) updateData.notes = notes;
        if (listingStatus !== undefined) updateData.listingStatus = listingStatus;

        const listing = await prisma.listing.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json({
            success: true,
            data: listing
        });
    } catch (error) {
        console.error('[Listings] Error updating listing:', error);
        next(error);
    }
});

/**
 * GET /api/listing
 * Get all listings (for dashboard)
 * Query params: search, status, categoryId, sortBy, sortOrder
 */
router.get('/', async (req, res, next) => {
    try {
        const { search, status, categoryId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const where = {};

        // Search filter (SQLite doesn't support case-insensitive mode, so we use contains)
        if (search) {
            where.OR = [
                { code: { contains: search } },
                { title: { contains: search } },
                { notes: { contains: search } }
            ];
        }

        // Status filter
        if (status && status !== 'all') {
            where.listingStatus = status;
        }

        // Category filter
        if (categoryId && categoryId !== 'all') {
            where.categoryId = parseInt(categoryId);
        }

        // Build orderBy clause
        let orderBy = {};
        if (sortBy === 'category') {
            // Sort by category name (requires join)
            orderBy = { category: { name: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const listings = await prisma.listing.findMany({
            where,
            include: {
                images: {
                    take: 1, // Only fetch the first image for thumbnail
                    orderBy: { order: 'asc' }
                },
                category: true, // Include category for display and sorting
                storageLocation: true, // Include storage location
                _count: {
                    select: { alerts: true }
                }
            },
            orderBy
        });

        res.json({ success: true, listings });
    } catch (error) {
        console.error('[Listings] Error fetching all listings:', error);
        next(error);
    }
});

/**
 * GET /api/listing/:id
 * Get listing by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const listing = await prisma.listing.findUnique({
            where: { id: parseInt(id) },
            include: {
                images: {
                    orderBy: { order: 'asc' }
                },
                storageLocation: true, // Include storage location
                category: true // Include category
            }
        });

        if (!listing) {
            return res.status(404).json({
                success: false,
                error: 'Listing not found'
            });
        }

        res.json({
            success: true,
            data: listing
        });
    } catch (error) {
        console.error('[Listings] Error fetching listing:', error);
        next(error);
    }
});

export default router;

