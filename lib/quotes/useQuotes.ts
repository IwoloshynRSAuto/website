/**
 * Client hooks for quotes API
 * Client-side code
 */

'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

const API_BASE = '/api/quotes'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
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

export function useQuotes() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotes = async (filters?: {
    status?: string
    customerId?: string
    search?: string
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.customerId) params.append('customerId', filters.customerId)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)

      const url = `${API_BASE}?${params.toString()}`
      const quotes = await apiCall<any[]>(url)
      return quotes
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to fetch quotes')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchQuotes, loading, error }
}

export function useQuote(id: string) {
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchQuote = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiCall<any>(`${API_BASE}/${id}`)
      setQuote(data)
      return data
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to fetch quote')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { quote, fetchQuote, loading, error }
}

export function useCreateQuote() {
  const [loading, setLoading] = useState(false)

  const createQuote = async (data: {
    bomId: string
    customerId?: string | null
    title?: string
    description?: string | null
  }) => {
    setLoading(true)
    try {
      const quote = await apiCall<any>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Quote created successfully')
      return quote
    } catch (err: any) {
      toast.error(err.message || 'Failed to create quote')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createQuote, loading }
}

export function useUpdateQuote() {
  const [loading, setLoading] = useState(false)

  const updateQuote = async (id: string, data: any) => {
    setLoading(true)
    try {
      const quote = await apiCall<any>(`${API_BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      toast.success('Quote updated successfully')
      return quote
    } catch (err: any) {
      toast.error(err.message || 'Failed to update quote')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updateQuote, loading }
}

export function useExportQuotePDF() {
  const [loading, setLoading] = useState(false)

  const exportPDF = async (quoteId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/${quoteId}/export`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quote-${quoteId}-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('PDF exported successfully')
      return blob
    } catch (err: any) {
      toast.error(err.message || 'Failed to export PDF')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { exportPDF, loading }
}

export function useUploadQuoteFile() {
  const [loading, setLoading] = useState(false)

  const uploadFile = async (quoteId: string, file: File) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/${quoteId}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload file')
      }

      toast.success('File uploaded successfully')
      return data
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { uploadFile, loading }
}

