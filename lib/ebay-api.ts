import axios from 'axios'

// Use portal's own API routes (not separate backend)
const createEbayApiInstance = () => {
  const baseURL = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  return axios.create({
    baseURL: `${baseURL}/api/ebay`,
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })
}

const api = createEbayApiInstance()

// Listings API
export const listings = {
  getAll: (params?: any) => api.get('/listings', { params }),
  getById: (id: string | number) => api.get(`/listings/${id}`),
  create: (formData: FormData) => {
    return api.post('/listings/create', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000
    })
  },
  update: (id: string | number, data: any) => api.put(`/listings/${id}`, data),
  delete: (id: string | number) => api.delete(`/listings/${id}`),
  uploadImages: (id: string | number, formData: FormData) => {
    return api.post(`/listings/${id}/images`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000
    })
  },
  getPricing: (id: string | number) => api.post(`/listings/${id}/pricing`),
  generateAlerts: (id: string | number) => api.post(`/listings/${id}/alerts`),
  getStats: () => api.get('/listings/stats')
}

// eBay API
export const ebay = {
  getAuthUrl: () => api.get('/ebay/auth'),
  uploadListing: (listingId: string | number, userId: number) => api.post(`/ebay/upload/${listingId}`, { userId }),
  getStatus: (listingId: string | number) => api.get(`/ebay/status/${listingId}`)
}

// Settings API
export const settings = {
  getLocations: () => api.get('/settings/locations'),
  createLocation: (data: any) => api.post('/settings/locations', data),
  updateLocation: (id: string | number, data: any) => api.put(`/settings/locations/${id}`, data),
  deleteLocation: (id: string | number) => api.delete(`/settings/locations/${id}`),

  getConditions: () => api.get('/settings/conditions'),
  createCondition: (data: any) => api.post('/settings/conditions', data),
  updateCondition: (id: string | number, data: any) => api.put(`/settings/conditions/${id}`, data),
  deleteCondition: (id: string | number) => api.delete(`/settings/conditions/${id}`),

  getCategories: () => api.get('/settings/categories'),
  createCategory: (data: any) => api.post('/settings/categories', data),
  updateCategory: (id: string | number, data: any) => api.put(`/settings/categories/${id}`, data),
  deleteCategory: (id: string | number) => api.delete(`/settings/categories/${id}`)
}

// AI API (Stub/Placeholder)
export const ai = {
  analyze: (formData: FormData) => api.post('/ai/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  generateDescription: (productInfo: any) => api.post('/ai/description', { productInfo }),
  generatePricing: (listing: any) => api.post('/ai/pricing', { listing })
}

export const ebayApi = {
  listings,
  ebay,
  settings,
  ai
}

export default api

