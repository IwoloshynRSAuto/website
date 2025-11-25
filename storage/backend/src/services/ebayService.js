import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Support both Sandbox and Production
const EBAY_ENVIRONMENT = process.env.EBAY_ENVIRONMENT || 'SANDBOX';
const EBAY_API_BASE = EBAY_ENVIRONMENT === 'PRODUCTION' 
    ? 'https://api.ebay.com' 
    : 'https://api.sandbox.ebay.com';

/**
 * Validate eBay credentials are configured
 * @throws {Error} If credentials are missing
 */
function validateCredentials() {
    if (!process.env.EBAY_APP_ID) {
        throw new Error('EBAY_APP_ID is not configured. Please set it in your .env file. See EBAY_SETUP.md for instructions.');
    }
    if (!process.env.EBAY_CERT_ID) {
        throw new Error('EBAY_CERT_ID is not configured. Please set it in your .env file. See EBAY_SETUP.md for instructions.');
    }
    if (!process.env.EBAY_REDIRECT_URI) {
        throw new Error('EBAY_REDIRECT_URI is not configured. Please set it in your .env file. See EBAY_SETUP.md for instructions.');
    }
}

/**
 * Get OAuth authorization URL
 */
export function getAuthUrl(state) {
    validateCredentials();

    // Use appropriate scope URLs based on environment
    const scopeBase = EBAY_ENVIRONMENT === 'PRODUCTION' 
        ? 'https://api.ebay.com' 
        : 'https://api.sandbox.ebay.com';
    
    const scopes = [
        `${scopeBase}/oauth/api_scope`,
        `${scopeBase}/oauth/api_scope/sell.inventory`,
        `${scopeBase}/oauth/api_scope/sell.marketing`,
        `${scopeBase}/oauth/api_scope/sell.account`
    ].join(' ');

    const params = new URLSearchParams({
        client_id: process.env.EBAY_APP_ID,
        response_type: 'code',
        redirect_uri: process.env.EBAY_REDIRECT_URI,
        scope: scopes,
        state: state
    });

    return `${EBAY_API_BASE}/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function getAccessToken(code) {
    validateCredentials();

    if (!code) {
        throw new Error('Authorization code is required');
    }

    try {
        const credentials = Buffer.from(
            `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
        ).toString('base64');

        const response = await axios.post(
            `${EBAY_API_BASE}/identity/v1/oauth2/token`,
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.EBAY_REDIRECT_URI
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${credentials}`
                }
            }
        );

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            expiresIn: response.data.expires_in
        };
    } catch (error) {
        const errorData = error.response?.data;
        const errorMessage = errorData?.error_description || errorData?.error || error.message;
        console.error('eBay OAuth Error:', errorData || error.message);
        
        if (error.response?.status === 401) {
            throw new Error(`eBay authentication failed: ${errorMessage}. Please check your EBAY_APP_ID and EBAY_CERT_ID.`);
        } else if (error.response?.status === 400) {
            throw new Error(`eBay OAuth error: ${errorMessage}. Please verify your EBAY_REDIRECT_URI matches your app settings.`);
        }
        
        throw new Error(`Failed to obtain eBay access token: ${errorMessage}`);
    }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken) {
    validateCredentials();

    if (!refreshToken) {
        throw new Error('Refresh token is required');
    }

    try {
        const credentials = Buffer.from(
            `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
        ).toString('base64');

        const response = await axios.post(
            `${EBAY_API_BASE}/identity/v1/oauth2/token`,
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                scope: `${EBAY_API_BASE}/oauth/api_scope/sell.inventory`
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${credentials}`
                }
            }
        );

        return {
            accessToken: response.data.access_token,
            expiresIn: response.data.expires_in
        };
    } catch (error) {
        const errorData = error.response?.data;
        const errorMessage = errorData?.error_description || errorData?.error || error.message;
        console.error('eBay Token Refresh Error:', errorData || error.message);
        
        if (error.response?.status === 401) {
            throw new Error(`eBay token refresh failed: ${errorMessage}. You may need to re-authorize your eBay account.`);
        }
        
        throw new Error(`Failed to refresh eBay access token: ${errorMessage}`);
    }
}

/**
 * Create draft listing on eBay
 */
export async function createDraftListing(listing, accessToken) {
    if (!accessToken) {
        throw new Error('eBay access token is required. Please authorize your eBay account first.');
    }

    if (!listing) {
        throw new Error('Listing data is required');
    }

    if (!listing.images || listing.images.length === 0) {
        throw new Error('At least one image is required for eBay listing');
    }

    try {
        // Convert relative image URLs to absolute URLs
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const imageUrls = listing.images
            .sort((a, b) => a.order - b.order)
            .map(img => {
                if (img.url.startsWith('http')) {
                    return img.url;
                }
                return `${baseUrl}${img.url}`;
            });

        // Parse item specifics from JSON string if needed
        let itemSpecifics = {};
        if (listing.aiAnalysis?.itemSpecifics) {
            try {
                itemSpecifics = typeof listing.aiAnalysis.itemSpecifics === 'string'
                    ? JSON.parse(listing.aiAnalysis.itemSpecifics)
                    : listing.aiAnalysis.itemSpecifics;
            } catch (e) {
                console.error('Failed to parse item specifics:', e);
            }
        }

        // Build eBay listing payload according to eBay Inventory API
        // Note: This is a simplified structure. In production, you may need to adjust based on eBay API requirements
        const payload = {
            sku: listing.code,
            marketplaceId: 'EBAY_US',
            format: 'FIXED_PRICE',
            listingDescription: listing.description || listing.title || 'Untitled Listing',
            pricingSummary: {
                price: {
                    value: (listing.currentPrice || listing.suggestedPrice || 0).toString(),
                    currency: 'USD'
                }
            },
            quantity: 1,
            condition: mapConditionToEbay(listing.condition?.code),
            categoryId: listing.category?.ebayId || '1'
        };

        // Add listing policies if configured
        const policies = {};
        if (process.env.EBAY_FULFILLMENT_POLICY_ID) {
            policies.fulfillmentPolicyId = process.env.EBAY_FULFILLMENT_POLICY_ID;
        }
        if (process.env.EBAY_PAYMENT_POLICY_ID) {
            policies.paymentPolicyId = process.env.EBAY_PAYMENT_POLICY_ID;
        }
        if (process.env.EBAY_RETURN_POLICY_ID) {
            policies.returnPolicyId = process.env.EBAY_RETURN_POLICY_ID;
        }
        if (Object.keys(policies).length > 0) {
            payload.listingPolicies = policies;
        }

        // Add product information
        payload.product = {
            title: listing.title || 'Untitled Listing',
            description: listing.description || '',
            imageUrls: imageUrls
        };

        // Add aspects (item specifics) if available
        if (Object.keys(itemSpecifics).length > 0) {
            payload.product.aspects = itemSpecifics;
        }

        const response = await axios.post(
            `${EBAY_API_BASE}/sell/inventory/v1/offer`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Language': 'en-US'
                }
            }
        );

        return {
            offerId: response.data.offerId,
            listingId: response.data.listingId,
            status: 'DRAFT',
            listingUrl: response.data.listingHref || null
        };
    } catch (error) {
        const errorData = error.response?.data;
        const errorMessage = errorData?.errors?.[0]?.message || errorData?.message || error.message;
        console.error('eBay Listing Creation Error:', errorData || error.message);
        
        if (error.response?.status === 401) {
            throw new Error(`eBay authentication failed: ${errorMessage}. Your access token may have expired. Please re-authorize.`);
        } else if (error.response?.status === 400) {
            throw new Error(`eBay listing validation error: ${errorMessage}. Please check your listing data and policy IDs.`);
        } else if (error.response?.status === 403) {
            throw new Error(`eBay permission denied: ${errorMessage}. Please verify your app has the required scopes.`);
        }
        
        throw new Error(`Failed to create eBay listing: ${errorMessage}`);
    }
}

/**
 * Map internal condition codes to eBay condition IDs
 */
function mapConditionToEbay(conditionCode) {
    const mapping = {
        'new': 'NEW',
        'like_new': 'LIKE_NEW',
        'good': 'VERY_GOOD',
        'fair': 'GOOD',
        'for_parts': 'FOR_PARTS_OR_NOT_WORKING'
    };
    return mapping[conditionCode] || 'USED_ACCEPTABLE';
}

/**
 * Update listing status from eBay
 */
export async function syncListingStatus(ebayListingId, accessToken) {
    if (!accessToken) {
        throw new Error('eBay access token is required');
    }

    if (!ebayListingId) {
        throw new Error('eBay listing ID is required');
    }

    try {
        const response = await axios.get(
            `${EBAY_API_BASE}/sell/inventory/v1/offer/${ebayListingId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Language': 'en-US'
                }
            }
        );

        return {
            status: response.data.status,
            listingUrl: response.data.listing?.listingUrl || response.data.listingHref
        };
    } catch (error) {
        const errorData = error.response?.data;
        const errorMessage = errorData?.errors?.[0]?.message || errorData?.message || error.message;
        console.error('eBay Status Sync Error:', errorData || error.message);
        
        if (error.response?.status === 404) {
            throw new Error(`eBay listing not found: ${ebayListingId}. It may have been deleted.`);
        } else if (error.response?.status === 401) {
            throw new Error(`eBay authentication failed: ${errorMessage}. Please re-authorize.`);
        }
        
        throw new Error(`Failed to sync eBay listing status: ${errorMessage}`);
    }
}

export default {
    getAuthUrl,
    getAccessToken,
    refreshAccessToken,
    createDraftListing,
    syncListingStatus
};
