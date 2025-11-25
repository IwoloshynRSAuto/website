import express from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import ebayService from '../services/ebayService.js';
import listingService from '../services/listingService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Store for state tokens (in production, use Redis or database)
const stateTokens = new Map();

/**
 * GET /api/ebay/auth
 * Initiate eBay OAuth flow
 */
router.get('/auth', (req, res) => {
    try {
        const state = crypto.randomBytes(16).toString('hex');
        const userId = req.query.userId || 1; // TODO: Get from auth middleware

        // Store state with user ID
        stateTokens.set(state, { userId, timestamp: Date.now() });

        // Clean up old tokens (older than 10 minutes)
        for (const [key, value] of stateTokens.entries()) {
            if (Date.now() - value.timestamp > 600000) {
                stateTokens.delete(key);
            }
        }

        const authUrl = ebayService.getAuthUrl(state);
        res.json({ success: true, authUrl });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/ebay/callback
 * eBay OAuth callback handler
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).send('Missing authorization code or state');
        }

        // Verify state token
        const stateData = stateTokens.get(state);
        if (!stateData) {
            return res.status(400).send('Invalid or expired state token');
        }
        stateTokens.delete(state);

        // Exchange code for tokens
        const tokens = await ebayService.getAccessToken(code);

        // Store tokens in database (you might want a separate tokens table)
        // For now, we'll store in user metadata as JSON string
        const user = await prisma.user.findUnique({
            where: { id: stateData.userId }
        });
        
        const existingMetadata = user?.metadata ? JSON.parse(user.metadata) : {};
        const newMetadata = {
            ...existingMetadata,
            ebayAccessToken: tokens.accessToken,
            ebayRefreshToken: tokens.refreshToken,
            ebayTokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        };
        
        await prisma.user.update({
            where: { id: stateData.userId },
            data: {
                // Note: In production, encrypt these tokens
                metadata: JSON.stringify(newMetadata)
            }
        });

        // Redirect to frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/?ebay_connected=true`);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send('Authentication failed');
    }
});

/**
 * POST /api/ebay/upload/:listingId
 * Upload a listing to eBay
 */
router.post('/upload/:listingId', async (req, res, next) => {
    try {
        const userId = req.body.userId || 1; // TODO: Get from auth middleware
        const listingId = parseInt(req.params.listingId);

        // Get user's eBay tokens
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user?.metadata) {
            return res.status(401).json({
                success: false,
                error: 'eBay not connected. Please authorize eBay access first.'
            });
        }

        const userMetadata = JSON.parse(user.metadata);
        
        if (!userMetadata?.ebayAccessToken) {
            return res.status(401).json({
                success: false,
                error: 'eBay not connected. Please authorize eBay access first.'
            });
        }

        // Check if token is expired
        const tokenExpiry = new Date(userMetadata.ebayTokenExpiry);
        let accessToken = userMetadata.ebayAccessToken;

        if (tokenExpiry < new Date()) {
            // Refresh token
            const refreshed = await ebayService.refreshAccessToken(userMetadata.ebayRefreshToken);
            accessToken = refreshed.accessToken;

            // Update stored tokens
            const updatedMetadata = {
                ...userMetadata,
                ebayAccessToken: refreshed.accessToken,
                ebayTokenExpiry: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
            };
            
            await prisma.user.update({
                where: { id: userId },
                data: {
                    metadata: JSON.stringify(updatedMetadata)
                }
            });
        }

        // Get listing with all data
        const listing = await listingService.getListingById(listingId);

        // Create eBay listing
        const ebayResult = await ebayService.createDraftListing(listing, accessToken);

        // Save eBay data
        await prisma.ebayData.upsert({
            where: { listingId },
            create: {
                listingId,
                ebayListingId: ebayResult.listingId,
                listingUrl: ebayResult.listingUrl,
                status: ebayResult.status,
                listedAt: new Date()
            },
            update: {
                ebayListingId: ebayResult.listingId,
                listingUrl: ebayResult.listingUrl,
                status: ebayResult.status,
                listedAt: new Date()
            }
        });

        // Update listing status
        await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: 'active',
                postedDate: new Date()
            }
        });

        res.json({
            success: true,
            data: {
                ebayListingId: ebayResult.listingId,
                status: ebayResult.status
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/ebay/status/:listingId
 * Sync listing status from eBay
 */
router.get('/status/:listingId', async (req, res, next) => {
    try {
        const userId = req.query.userId || 1; // TODO: Get from auth middleware
        const listingId = parseInt(req.params.listingId);

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user?.metadata) {
            return res.status(401).json({
                success: false,
                error: 'eBay not connected'
            });
        }

        const userMetadata = JSON.parse(user.metadata);
        
        if (!userMetadata?.ebayAccessToken) {
            return res.status(401).json({
                success: false,
                error: 'eBay not connected'
            });
        }

        const ebayData = await prisma.ebayData.findUnique({
            where: { listingId }
        });

        if (!ebayData?.ebayListingId) {
            return res.status(404).json({
                success: false,
                error: 'Listing not uploaded to eBay'
            });
        }

        const status = await ebayService.syncListingStatus(
            ebayData.ebayListingId,
            userMetadata.ebayAccessToken
        );

        if (status) {
            // Update database
            await prisma.ebayData.update({
                where: { listingId },
                data: {
                    status: status.status,
                    listingUrl: status.listingUrl
                }
            });
        }

        res.json({ success: true, data: status });
    } catch (error) {
        next(error);
    }
});

export default router;
