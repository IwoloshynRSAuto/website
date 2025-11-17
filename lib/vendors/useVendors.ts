/**
 * Client hooks for vendors API
 * Client-side code
 */

'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

const API_BASE = '/api/vendors'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function apiCall<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data: ApiResponse<T> = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }

  return data.data as T
}

export function useVendors() {
  const [loading, setLoading] = useState(false)

  const fetchVendors = async (filters?: {
    search?: string
    category?: string
    isActive?: boolean
  }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.category) params.append('category', filters.category)
      if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive))

      const url = `${API_BASE}?${params.toString()}`
      return await apiCall<any[]>(url)
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch vendors')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createVendor = async (data: any) => {
    setLoading(true)
    try {
      const vendor = await apiCall<any>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Vendor created successfully')
      return vendor
    } catch (err: any) {
      toast.error(err.message || 'Failed to create vendor')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchVendors, createVendor, loading }
}

export function useVendor(id: string) {
  const [loading, setLoading] = useState(false)

  const fetchVendor = async () => {
    setLoading(true)
    try {
      return await apiCall<any>(`${API_BASE}/${id}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch vendor')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateVendor = async (data: any) => {
    setLoading(true)
    try {
      const vendor = await apiCall<any>(`${API_BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      toast.success('Vendor updated successfully')
      return vendor
    } catch (err: any) {
      toast.error(err.message || 'Failed to update vendor')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async (year?: number) => {
    setLoading(true)
    try {
      const url = year ? `${API_BASE}/${id}/metrics?year=${year}` : `${API_BASE}/${id}/metrics`
      return await apiCall<any>(url)
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch vendor metrics')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchVendor, updateVendor, fetchMetrics, loading }
}

export function useVendorPartPrices() {
  const [loading, setLoading] = useState(false)

  const fetchPrices = async (filters?: {
    vendorId?: string
    partId?: string
    effectiveDate?: string
  }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters?.vendorId) params.append('vendorId', filters.vendorId)
      if (filters?.partId) params.append('partId', filters.partId)
      if (filters?.effectiveDate) params.append('effectiveDate', filters.effectiveDate)

      const url = `${API_BASE}/part-prices?${params.toString()}`
      return await apiCall<any[]>(url)
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch vendor part prices')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createPrice = async (data: any) => {
    setLoading(true)
    try {
      const price = await apiCall<any>(`${API_BASE}/part-prices`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Vendor part price created successfully')
      return price
    } catch (err: any) {
      toast.error(err.message || 'Failed to create vendor part price')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchPrices, createPrice, loading }
}

