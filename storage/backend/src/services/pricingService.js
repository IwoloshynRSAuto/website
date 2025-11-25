import axios from 'axios';
import { calculateDaysSince } from '../utils/codeGenerator.js';
import { generatePricingStub } from './aiServiceStub.js';

// Check if real pricing is enabled
const USE_REAL_PRICING = process.env.ENABLE_REAL_PRICING === 'true' && process.env.EBAY_APP_ID;

// Always use production - no sandbox
const EBAY_API_BASE = 'https://api.ebay.com';

/**
 * Calculate condition multiplier
 */
function getConditionMultiplier(conditionCode) {
    const multipliers = {
        'new': 1.0,
        'like_new': 0.85,
        'good': 0.70,
        'fair': 0.50,
        'for_parts': 0.30
    };
    return multipliers[conditionCode] || 0.70;
}

/**
 * Search eBay for sold listings
 */
export async function searchSoldListings(keywords, category = null) {
    try {
        // Note: This requires eBay Finding API access
        // For production, you'll need to implement proper eBay API authentication

        const params = {
            'OPERATION-NAME': 'findCompletedItems',
            'SERVICE-VERSION': '1.0.0',
            'SECURITY-APPNAME': process.env.EBAY_APP_ID,
            'RESPONSE-DATA-FORMAT': 'JSON',
            'REST-PAYLOAD': '',
            'keywords': keywords,
            'itemFilter(0).name': 'SoldItemsOnly',
            'itemFilter(0).value': 'true',
            'sortOrder': 'EndTimeSoonest',
            'paginationInput.entriesPerPage': '100'
        };

        if (category) {
            params['categoryId'] = category;
        }

        const response = await axios.get(`${EBAY_API_BASE}/services/search/FindingService/v1`, {
            params,
            timeout: 10000
        });

        const items = response.data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

        return items.map(item => ({
            itemId: item.itemId?.[0],
            title: item.title?.[0],
            price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
            condition: item.condition?.[0]?.conditionDisplayName?.[0],
            endTime: item.listingInfo?.[0]?.endTime?.[0],
            shippingCost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0)
        }));
    } catch (error) {
        console.error('Error searching sold listings:', error.message);
        // Return empty array if API fails
        return [];
    }
}

/**
 * Search eBay for active listings
 */
export async function searchActiveListings(keywords, category = null) {
    try {
        const params = {
            'OPERATION-NAME': 'findItemsAdvanced',
            'SERVICE-VERSION': '1.0.0',
            'SECURITY-APPNAME': process.env.EBAY_APP_ID,
            'RESPONSE-DATA-FORMAT': 'JSON',
            'REST-PAYLOAD': '',
            'keywords': keywords,
            'itemFilter(0).name': 'ListingType',
            'itemFilter(0).value(0)': 'FixedPrice',
            'itemFilter(0).value(1)': 'Auction',
            'sortOrder': 'PricePlusShippingLowest',
            'paginationInput.entriesPerPage': '50'
        };

        if (category) {
            params['categoryId'] = category;
        }

        const response = await axios.get(`${EBAY_API_BASE}/services/search/FindingService/v1`, {
            params,
            timeout: 10000
        });

        const items = response.data?.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];

        return items.map(item => ({
            itemId: item.itemId?.[0],
            title: item.title?.[0],
            price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
            condition: item.condition?.[0]?.conditionDisplayName?.[0],
            listingType: item.listingInfo?.[0]?.listingType?.[0],
            shippingCost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0)
        }));
    } catch (error) {
        console.error('Error searching active listings:', error.message);
        return [];
    }
}

/**
 * Calculate pricing statistics
 */
function calculatePriceStats(prices) {
    if (prices.length === 0) {
        return { avg: 0, median: 0, min: 0, max: 0 };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
        avg: sum / sorted.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: sorted.length
    };
}

/**
 * Generate pricing recommendations (or stub if not enabled)
 */
export async function generatePricingSuggestions(listing) {
    // Use stub if real pricing is not enabled
    if (!USE_REAL_PRICING) {
        console.log('[Pricing] Using stub pricing - real pricing not connected');
        return await generatePricingStub(listing);
    }

    try {
        // Build search query
        const searchTerms = [
            listing.aiAnalysis?.detectedBrand,
            listing.aiAnalysis?.detectedModel,
            listing.title
        ].filter(Boolean).join(' ');

        if (!searchTerms) {
            throw new Error('Insufficient data for pricing analysis');
        }

        // Search sold and active listings
        const [soldItems, activeItems] = await Promise.all([
            searchSoldListings(searchTerms, listing.category?.ebayId),
            searchActiveListings(searchTerms, listing.category?.ebayId)
        ]);

        // Calculate statistics
        const soldPrices = soldItems.map(item => item.price).filter(p => p > 0);
        const activePrices = activeItems.map(item => item.price).filter(p => p > 0);
        const shippingCosts = [...soldItems, ...activeItems]
            .map(item => item.shippingCost)
            .filter(c => c > 0);

        const soldStats = calculatePriceStats(soldPrices);
        const activeStats = calculatePriceStats(activePrices);
        const shippingStats = calculatePriceStats(shippingCosts);

        // Apply condition multiplier
        const conditionMultiplier = listing.condition
            ? getConditionMultiplier(listing.condition.code)
            : 0.70;

        // Calculate suggested prices
        const basePrice = soldStats.median > 0 ? soldStats.median : activeStats.median;
        const suggestedPrice = basePrice * conditionMultiplier;
        const auctionStart = suggestedPrice * 0.70;
        const suggestedShipping = shippingStats.median || 0;

        // Calculate markdown if old listing
        let markdownSuggestion = null;
        const daysSince = calculateDaysSince(listing.postedDate);
        if (daysSince && daysSince > 100) {
            const markdownPercent = Math.min(15, Math.floor((daysSince - 100) / 10) * 2);
            markdownSuggestion = {
                percent: markdownPercent,
                newPrice: suggestedPrice * (1 - markdownPercent / 100),
                reason: `Listing is ${daysSince} days old`
            };
        }

        return {
            suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
            auctionStartPrice: parseFloat(auctionStart.toFixed(2)),
            suggestedShipping: parseFloat(suggestedShipping.toFixed(2)),
            confidence: soldStats.count >= 5 ? 0.8 : soldStats.count >= 2 ? 0.6 : 0.3,
            marketData: {
                soldListings: {
                    count: soldStats.count,
                    avgPrice: parseFloat(soldStats.avg.toFixed(2)),
                    medianPrice: parseFloat(soldStats.median.toFixed(2)),
                    range: {
                        min: parseFloat(soldStats.min.toFixed(2)),
                        max: parseFloat(soldStats.max.toFixed(2))
                    }
                },
                activeListings: {
                    count: activeStats.count,
                    avgPrice: parseFloat(activeStats.avg.toFixed(2)),
                    medianPrice: parseFloat(activeStats.median.toFixed(2)),
                    range: {
                        min: parseFloat(activeStats.min.toFixed(2)),
                        max: parseFloat(activeStats.max.toFixed(2))
                    }
                }
            },
            conditionMultiplier,
            markdownSuggestion,
            analyzedAt: new Date()
        };
    } catch (error) {
        console.error('Pricing Error:', error);
        throw new Error(`Pricing analysis failed: ${error.message}`);
    }
}

export default {
    searchSoldListings,
    searchActiveListings,
    generatePricingSuggestions
};
