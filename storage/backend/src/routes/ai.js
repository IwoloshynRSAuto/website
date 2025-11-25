import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import aiService from '../services/aiService.js';
import { getCostEstimate, getUsageStats } from '../services/aiCostService.js';
import { getLockStatus } from '../services/aiQueueService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ai-temp-' + uniqueSuffix + path.extname(file.originalname));
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
 * POST /api/ai/analyze
 * Comprehensive image analysis with AI and market data
 * Returns full listing data in the requested format
 */
router.post('/analyze', upload.array('images', 10), async (req, res, next) => {
    let imagePaths = [];
    
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No images provided' 
            });
        }

        imagePaths = req.files.map(file => file.path);
        const listingId = req.body.listingId ? parseInt(req.body.listingId) : null;
        
        // Use AI service (handles real AI or stub)
        const result = await aiService.analyzeImages(imagePaths, listingId);

        // Clean up temporary AI files after analysis
        req.files.forEach(file => {
            try {
                if (file.path && file.filename.startsWith('ai-temp-')) {
                    fs.unlinkSync(file.path);
                    console.log(`[AI] Cleaned up temporary file: ${file.filename}`);
                }
            } catch (error) {
                console.warn(`[AI] Failed to delete temp file ${file.filename}:`, error);
            }
        });

        // Return comprehensive format (exact structure as requested)
        if (result.comprehensive) {
            // Real AI - return comprehensive format matching exact specification
            const response = {
                title: result.comprehensive.title || '',
                description: result.comprehensive.description || '',
                bullets: result.comprehensive.bullets || [],
                pricing: result.comprehensive.pricing || {
                    display: '',
                    reason: ''
                },
                marketSamples: result.comprehensive.marketSamples || [],
                seoKeywords: result.comprehensive.seoKeywords || [],
                suggestedPhotos: result.comprehensive.suggestedPhotos || []
            };
            
            res.json(response);
        } else {
            // Stub mode - still return proper structure (but with stub data)
            const analysis = result.analysis;
            res.json({
                title: analysis.title || 'Product Listing',
                description: analysis.description || 'Product description will be generated when AI is connected.',
                bullets: [
                    analysis.brand ? `Brand: ${analysis.brand}` : null,
                    analysis.model ? `Model: ${analysis.model}` : null,
                    `Condition: ${analysis.condition || 'Good'}`
                ].filter(Boolean),
                pricing: {
                    display: 'Market analysis unavailable',
                    reason: 'AI analysis not connected. Connect OpenAI API to get real pricing data.'
                },
                marketSamples: [],
                seoKeywords: analysis.keywords || [],
                suggestedPhotos: [
                    'Close-up of product label',
                    'Different angle view',
                    'Photo showing size/scale'
                ]
            });
        }
    } catch (error) {
        // Clean up files on error
        if (imagePaths.length > 0) {
            imagePaths.forEach(imagePath => {
                try {
                    if (imagePath && imagePath.includes('ai-temp-')) {
                        fs.unlinkSync(imagePath);
                    }
                } catch (cleanupError) {
                    console.warn(`[AI] Failed to cleanup on error: ${imagePath}`, cleanupError);
                }
            });
        }
        console.error('AI analysis error:', error);
        next(error);
    }
});

/**
 * POST /api/ai/description
 * Generate description using AI (real or stub)
 */
router.post('/description', async (req, res, next) => {
    try {
        const { productInfo, listingId } = req.body;
        const listingIdInt = listingId ? parseInt(listingId) : null;
        
        const result = await aiService.generateDescription(productInfo || {}, listingIdInt);
        const isStub = !result.cost;

        const response = {
            success: true,
            status: isStub ? 'stub' : 'real',
            data: {
                description: result.description,
                message: isStub ? 'AI description generation not connected yet — this is dummy data.' : null
            }
        };

        // Add cost information if available
        if (result.cost) {
            response.cost = {
                operationCost: result.cost.cost,
                dailyTotalCost: result.cost.totalDailyCost,
                dailyTotalTokens: result.cost.totalDailyTokens
            };
        }

        res.json(response);
    } catch (error) {
        console.error('AI description error:', error);
        next(error);
    }
});

/**
 * GET /api/ai/estimate
 * Get cost estimate for an AI operation
 */
router.get('/estimate', async (req, res, next) => {
    try {
        const { operationType, imageCount } = req.query;
        
        if (!operationType || (operationType === 'analyze' && !imageCount)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: operationType and (imageCount for analyze)'
            });
        }

        const estimate = await getCostEstimate(
            operationType,
            operationType === 'analyze' ? parseInt(imageCount) : 0
        );

        res.json({
            success: true,
            data: estimate
        });
    } catch (error) {
        console.error('Cost estimate error:', error);
        next(error);
    }
});

/**
 * GET /api/ai/usage
 * Get current usage statistics
 */
router.get('/usage', async (req, res, next) => {
    try {
        const stats = await getUsageStats();
        const lockStatus = getLockStatus();

        res.json({
            success: true,
            data: {
                ...stats,
                queueStatus: lockStatus
            }
        });
    } catch (error) {
        console.error('Usage stats error:', error);
        next(error);
    }
});

export default router;

