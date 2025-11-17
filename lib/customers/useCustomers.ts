/**
 * Client hooks for customers API
 * Client-side code
 */

'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

const API_BASE = '/api/customers'

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

export function useCustomers() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = async (filters?: {
    activeOnly?: boolean
    search?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters?.activeOnly) params.append('activeOnly', 'true')
      if (filters?.search) params.append('search', filters.search)

      const url = `${API_BASE}?${params.toString()}`
      const customers = await apiCall<any[]>(url)
      return customers
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to fetch customers')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchCustomers, loading, error }
}

export function useCustomer(id: string) {
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomer = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/${id}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch customer')
      }
      const data = await response.json()
      setCustomer(data)
      return data
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to fetch customer')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { customer, fetchCustomer, loading, error }
}

export function useCreateCustomer() {
  const [loading, setLoading] = useState(false)

  const createCustomer = async (data: {
    name: string
    email?: string
    phone?: string
    address?: string
    fileLink?: string
  }) => {
    setLoading(true)
    try {
      const customer = await apiCall<any>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      toast.success('Customer created successfully')
      return customer
    } catch (err: any) {
      toast.error(err.message || 'Failed to create customer')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createCustomer, loading }
}

export function useUpdateCustomer() {
  const [loading, setLoading] = useState(false)

  const updateCustomer = async (id: string, data: {
    name?: string
    email?: string | null
    phone?: string | null
    address?: string | null
    isActive?: boolean
    fileLink?: string | null
  }) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update customer')
      }

      const customer = await response.json()
      toast.success('Customer updated successfully')
      return customer
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updateCustomer, loading }
}

export function useDeleteCustomer() {
  const [loading, setLoading] = useState(false)

  const deleteCustomer = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete customer')
      }

      toast.success('Customer deleted successfully')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { deleteCustomer, loading }
}

export function useCustomerMetrics() {
  const [loading, setLoading] = useState(false)

  const fetchMetrics = async (customerId: string, year?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (year) params.append('year', year.toString())

      const url = `${API_BASE}/${customerId}/metrics?${params.toString()}`
      const metrics = await apiCall<any>(url)
      return metrics
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch customer metrics')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { fetchMetrics, loading }
}


