import axios from 'axios';

const EBAY_API_BASE = 'https://api.ebay.com';

/**
 * Search eBay for comparable sold listings using Finding API
 * @param {string} keywords - Search keywords (brand + item type)
 * @param {string|null} categoryId - Optional category ID
 * @returns {Promise<Array>} Array of listing objects
 */
export async function searchComparableListings(keywords, categoryId = null) {
    if (!process.env.EBAY_APP_ID) {
        console.warn('[eBay Market] EBAY_APP_ID not configured, returning empty results');
        return [];
    }

    try {
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
            'paginationInput.entriesPerPage': '20'
        };

        if (categoryId) {
            params['categoryId'] = categoryId;
        }

        const response = await axios.get(`${EBAY_API_BASE}/services/search/FindingService/v1`, {
            params,
            timeout: 10000
        });

        const items = response.data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

        return items.map(item => ({
            itemId: item.itemId?.[0],
            title: item.title?.[0] || 'Untitled',
            price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
            condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
            endTime: item.listingInfo?.[0]?.endTime?.[0],
            shippingCost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0),
            link: item.viewItemURL?.[0] || `https://www.ebay.com/itm/${item.itemId?.[0]}`,
            imageUrl: item.galleryURL?.[0] || null
        })).filter(item => item.price > 0);
    } catch (error) {
        console.error('[eBay Market] Error searching sold listings:', error.message);
        return [];
    }
}

/**
 * Search eBay for active listings
 * @param {string} keywords - Search keywords
 * @param {string|null} categoryId - Optional category ID
 * @returns {Promise<Array>} Array of listing objects
 */
export async function searchActiveListings(keywords, categoryId = null) {
    if (!process.env.EBAY_APP_ID) {
        return [];
    }

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
            'sortOrder': 'PricePlusShippingLowest',
            'paginationInput.entriesPerPage': '20'
        };

        if (categoryId) {
            params['categoryId'] = categoryId;
        }

        const response = await axios.get(`${EBAY_API_BASE}/services/search/FindingService/v1`, {
            params,
            timeout: 10000
        });

        const items = response.data?.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];

        return items.map(item => ({
            itemId: item.itemId?.[0],
            title: item.title?.[0] || 'Untitled',
            price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
            condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
            shippingCost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0),
            link: item.viewItemURL?.[0] || `https://www.ebay.com/itm/${item.itemId?.[0]}`,
            imageUrl: item.galleryURL?.[0] || null
        })).filter(item => item.price > 0);
    } catch (error) {
        console.error('[eBay Market] Error searching active listings:', error.message);
        return [];
    }
}

/**
 * Calculate pricing statistics from market data
 * @param {Array} listings - Array of listing objects with price property
 * @returns {Object} Pricing statistics
 */
export function computePricingFromMarket(listings) {
    if (!listings || listings.length === 0) {
        return {
            low: 0,
            median: 0,
            high: 0,
            recommended: 0,
            count: 0
        };
    }

    const prices = listings.map(l => l.price).filter(p => p > 0).sort((a, b) => a - b);
    
    if (prices.length === 0) {
        return {
            low: 0,
            median: 0,
            high: 0,
            recommended: 0,
            count: 0
        };
    }

    const low = prices[0];
    const high = prices[prices.length - 1];
    const median = prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)];

    // Recommended price: slightly below median to be competitive
    const recommended = Math.round(median * 0.95 * 100) / 100;

    return {
        low: Math.round(low * 100) / 100,
        median: Math.round(median * 100) / 100,
        high: Math.round(high * 100) / 100,
        recommended: recommended,
        count: prices.length
    };
}

/**
 * Find comparable items and calculate pricing
 * @param {string} brand - Detected brand
 * @param {string} itemType - Item type/category
 * @param {string} model - Optional model number
 * @returns {Promise<{pricing: Object, samples: Array}>}
 */
export async function findComparableItems(brand, itemType, model = null) {
    // Build search query
    const searchTerms = [brand, model, itemType].filter(Boolean).join(' ');
    
    if (!searchTerms) {
        return {
            pricing: { low: 0, median: 0, high: 0, recommended: 0, count: 0 },
            samples: []
        };
    }

    // Search both sold and active listings
    const [soldListings, activeListings] = await Promise.all([
        searchComparableListings(searchTerms),
        searchActiveListings(searchTerms)
    ]);

    // Combine and prioritize sold listings
    const allListings = [...soldListings, ...activeListings.slice(0, 5)];
    
    // Calculate pricing
    const pricing = computePricingFromMarket(soldListings.length > 0 ? soldListings : allListings);

    // Get top 5 samples (mix of sold and active)
    const samples = allListings.slice(0, 5).map(listing => ({
        title: listing.title,
        price: listing.price,
        link: listing.link
    }));

    return {
        pricing,
        samples
    };
}

export default {
    searchComparableListings,
    searchActiveListings,
    computePricingFromMarket,
    findComparableItems
};

