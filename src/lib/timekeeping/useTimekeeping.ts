/**
 * Client hooks for timekeeping API
 * Client-side code
 */

'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

const API_BASE = '/api/timekeeping'

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

export function useTimeOffRequests() {
  const [loading, setLoading] = useState(false)

  const fetchRequests = async (filters?: {
    userId?: string
    status?: string
    requestType?: string
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters?.userId) params.append('userId', filters.userId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.requestType) params.append('requestType', filters.requestType)
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)

      const url = `${API_BASE}/time-off?${params.toString()}`
      return await apiCall<any[]>(url)
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch time-off requests')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createRequest = async (data: any) => {
    setLoading(true)
    try {
      const request = await apiCall<any>(`${API_BASE}/time-off`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Time-off request created successfully')
      return request
    } catch (err: any) {
      toast.error(err.message || 'Failed to create time-off request')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchRequests, createRequest, loading }
}

export function useExpenseReports() {
  const [loading, setLoading] = useState(false)

  const fetchReports = async (filters?: {
    userId?: string
    status?: string
    category?: string
    jobId?: string
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters?.userId) params.append('userId', filters.userId)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.category) params.append('category', filters.category)
      if (filters?.jobId) params.append('jobId', filters.jobId)
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)

      const url = `${API_BASE}/expenses?${params.toString()}`
      return await apiCall<any[]>(url)
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch expense reports')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createReport = async (data: any) => {
    setLoading(true)
    try {
      const report = await apiCall<any>(`${API_BASE}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Expense report created successfully')
      return report
    } catch (err: any) {
      toast.error(err.message || 'Failed to create expense report')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const uploadReceipt = async (reportId: string, file: File) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/expenses/${reportId}/receipt`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to upload receipt')
      }

      toast.success('Receipt uploaded successfully')
      return result.data
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload receipt')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchReports, createReport, uploadReceipt, loading }
}

export function useServiceReports() {
  const [loading, setLoading] = useState(false)

  const fetchReports = async (jobId: string) => {
    setLoading(true)
    try {
      return await apiCall<any[]>(`${API_BASE}/service-reports?jobId=${jobId}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch service reports')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createReport = async (data: any) => {
    setLoading(true)
    try {
      const report = await apiCall<any>(`${API_BASE}/service-reports`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Service report created successfully')
      return report
    } catch (err: any) {
      toast.error(err.message || 'Failed to create service report')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchReports, createReport, loading }
}

