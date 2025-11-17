/**
 * Client hooks for jobs API
 * Client-side code
 */

'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

const API_BASE = '/api/jobs'

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

export function useJobs() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = async (filters?: {
    status?: string
    type?: string
    assignedToId?: string
    customerId?: string
    search?: string
    priority?: string
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.assignedToId) params.append('assignedToId', filters.assignedToId)
      if (filters?.customerId) params.append('customerId', filters.customerId)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.priority) params.append('priority', filters.priority)
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)

      const url = `${API_BASE}?${params.toString()}`
      const jobs = await apiCall<any[]>(url)
      return jobs
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to fetch jobs')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchJobs, loading, error }
}

export function useJob(id: string) {
  const [loading, setLoading] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchJob = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiCall<any>(`${API_BASE}/${id}`)
      setJob(data)
      return data
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to fetch job')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { job, fetchJob, loading, error }
}

export function useCreateJob() {
  const [loading, setLoading] = useState(false)

  const createJob = async (data: any) => {
    setLoading(true)
    try {
      const job = await apiCall<any>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Job created successfully')
      return job
    } catch (err: any) {
      toast.error(err.message || 'Failed to create job')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createJob, loading }
}

export function useUpdateJob() {
  const [loading, setLoading] = useState(false)

  const updateJob = async (id: string, data: any) => {
    setLoading(true)
    try {
      const job = await apiCall<any>(`${API_BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      toast.success('Job updated successfully')
      return job
    } catch (err: any) {
      toast.error(err.message || 'Failed to update job')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updateJob, loading }
}

export function useConvertQuoteToJob() {
  const [loading, setLoading] = useState(false)

  const convertQuote = async (data: { quoteId: string; assignedToId?: string; startDate?: string; endDate?: string }) => {
    setLoading(true)
    try {
      const job = await apiCall<any>(`${API_BASE}/convert`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Quote converted to job successfully')
      return job
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert quote to job')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { convertQuote, loading }
}

export function useJobCosts() {
  const [loading, setLoading] = useState(false)

  const calculateCosts = async (jobId: string) => {
    setLoading(true)
    try {
      const costs = await apiCall<any>(`${API_BASE}/${jobId}/costs`, {
        method: 'GET',
      })
      return costs
    } catch (err: any) {
      toast.error(err.message || 'Failed to calculate job costs')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { calculateCosts, loading }
}

