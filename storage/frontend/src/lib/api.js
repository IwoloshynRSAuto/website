import axios from 'axios';

// Ensure API URL is properly set - fallback to localhost:5000 if not configured
// On mobile/network, use the network IP if available
const getAPIUrl = () => {
    if (typeof window === 'undefined') return 'http://192.168.10.70:5000';
    
    // First, check if API_CONFIG was loaded from api-config.js (not cached)
    if (window.API_CONFIG && window.API_CONFIG.API_URL) {
        console.log('[API] Using API_CONFIG from api-config.js:', window.API_CONFIG.API_URL);
        return window.API_CONFIG.API_URL;
    }
    
    // Get current hostname and origin
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    
    console.log('[API] Detection - hostname:', hostname, 'origin:', origin);
    
    // Check if we're on localhost
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Both PC and mobile use the network backend for consistency
    if (isLocalhost) {
        // PC accessing via localhost - use network IP backend
        console.log('[API] Detected localhost, using network backend: http://192.168.10.70:5000');
        return 'http://192.168.10.70:5000';
    } else {
        // On network access (IP address), construct URL from current hostname
        // This works when accessing via IP like http://192.168.10.70:3002
        const networkUrl = `http://${hostname}:5000`;
        console.log('[API] Detected network IP, using:', networkUrl);
        console.log('[API] Full window.location:', {
            hostname: window.location.hostname,
            host: window.location.host,
            origin: window.location.origin,
            href: window.location.href
        });
        return networkUrl;
    }
};

// Get API URL - this runs on every import to ensure fresh detection
// Both PC and mobile use the network backend for consistency
let API_URL = 'http://192.168.10.70:5000'; // Default fallback (network backend)

if (typeof window !== 'undefined') {
    const detectedUrl = getAPIUrl();
    API_URL = detectedUrl.replace(/\/$/, ''); // Remove trailing slash
} else {
    // Server-side rendering
    API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.10.70:5000';
}

console.log('[API] Final API URL:', API_URL);
console.log('[API] Window location:', typeof window !== 'undefined' ? {
    hostname: window.location.hostname,
    host: window.location.host,
    origin: window.location.origin,
    href: window.location.href
} : 'server-side');

// Create API instance with dynamic base URL
// We'll update this on each request to ensure we have the latest URL
const createApiInstance = () => {
    // Re-detect API URL on each call to ensure we have the latest
    let currentApiUrl = API_URL;
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        // Both PC and mobile use network backend for consistency
        currentApiUrl = isLocalhost ? 'http://192.168.10.70:5000' : `http://${hostname}:5000`;
    }
    
    return axios.create({
        baseURL: `${currentApiUrl}/api`,
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
    });
};

const api = createApiInstance();

// Override axios request to always use current hostname (for mobile cache issues)
const originalRequest = api.request.bind(api);
api.request = function(config) {
    // ALWAYS re-detect API URL for each request to handle mobile cache issues
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        // Both PC and mobile use network backend for consistency
        const currentApiUrl = isLocalhost ? 'http://192.168.10.70:5000' : `http://${hostname}:5000`;
        config.baseURL = `${currentApiUrl}/api`;
        console.log('[API] Request - hostname:', hostname, 'isLocalhost:', isLocalhost, 'baseURL:', config.baseURL);
    }
    return originalRequest(config);
};

// Add request interceptor for debugging - also ensure baseURL is correct
api.interceptors.request.use(
    (config) => {
        // Double-check baseURL is correct (handle mobile cache issues)
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
            // Both PC and mobile use network backend for consistency
            const correctApiUrl = isLocalhost ? 'http://192.168.10.70:5000' : `http://${hostname}:5000`;
            const correctBaseURL = `${correctApiUrl}/api`;
            
            if (config.baseURL !== correctBaseURL) {
                console.warn('[API] BaseURL mismatch! Correcting:', config.baseURL, '->', correctBaseURL);
                config.baseURL = correctBaseURL;
            }
        }
        console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('[API] Response error:', {
            code: error.code,
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            fullURL: `${error.config?.baseURL}${error.config?.url}`,
            request: error.request ? 'Request made but no response' : 'No request made'
        });
        
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            console.error('[API] Network error - is the backend server running?', {
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                fullURL: `${error.config?.baseURL}${error.config?.url}`
            });
        }
        return Promise.reject(error);
    }
);

// Listings API
export const listings = {
    getAll: (params) => api.get('/listing', { params }), // Use new v2 endpoint
    getById: (id) => api.get(`/listing/${id}`), // Use new v2 endpoint
    create: (data) => api.post('/listings', data),
    update: (id, data) => api.put(`/listings/${id}`, data),
    delete: (id) => api.delete(`/listings/${id}`),
    uploadImages: (id, formData) => {
        console.log('[API] Uploading images for listing:', id, 'Files:', formData.getAll('images').length);
        return api.post(`/listings/${id}/images`, formData, {
            headers: { 
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000 // 60 second timeout for file uploads
        });
    },
    getPricing: (id) => api.post(`/listings/${id}/pricing`),
    generateAlerts: (id) => api.post(`/listings/${id}/alerts`),
    getStats: () => api.get('/listings/stats')
};

// eBay API
export const ebay = {
    getAuthUrl: () => api.get('/ebay/auth'),
    uploadListing: (listingId, userId) => api.post(`/ebay/upload/${listingId}`, { userId }),
    getStatus: (listingId) => api.get(`/ebay/status/${listingId}`)
};

// Settings API
export const settings = {
    getLocations: () => api.get('/settings/locations'),
    createLocation: (data) => api.post('/settings/locations', data),
    updateLocation: (id, data) => api.put(`/settings/locations/${id}`, data),
    deleteLocation: (id) => api.delete(`/settings/locations/${id}`),

    getConditions: () => api.get('/settings/conditions'),
    createCondition: (data) => api.post('/settings/conditions', data),
    updateCondition: (id, data) => api.put(`/settings/conditions/${id}`, data),
    deleteCondition: (id) => api.delete(`/settings/conditions/${id}`),

    getCategories: () => api.get('/settings/categories'),
    createCategory: (data) => api.post('/settings/categories', data),
    updateCategory: (id, data) => api.put(`/settings/categories/${id}`, data),
    deleteCategory: (id) => api.delete(`/settings/categories/${id}`)
};

// AI API (Stub/Placeholder)
export const ai = {
    analyze: (formData) => api.post('/ai/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    generateDescription: (productInfo) => api.post('/ai/description', { productInfo }),
    generatePricing: (listing) => api.post('/ai/pricing', { listing })
};

export default api;
