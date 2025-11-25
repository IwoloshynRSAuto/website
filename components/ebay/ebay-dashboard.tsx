'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { ShoppingCart, Package, TrendingUp, CheckCircle, AlertTriangle, Plus, Search, Edit2, Trash2, DollarSign, Calendar, BarChart3, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ebayApi } from '@/lib/ebay-api'

export function EbayDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, sold: 0, alerts: 0 })
  const [listings, setListings] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [categories, setCategories] = useState([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [deleting, setDeleting] = useState(null)
  const [analytics, setAnalytics] = useState({
    totalValue: 0,
    avgPrice: 0,
    listingsByStatus: {},
    listingsByCategory: {},
    recentActivity: []
  })

  useEffect(() => {
    loadStats()
    loadCategories()
    loadListings()
  }, [])

  useEffect(() => {
    loadListings()
  }, [searchTerm, filterStatus, filterCategory, sortBy, sortOrder])

  async function loadStats() {
    try {
      const response = await ebayApi.listings.getStats()
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  async function loadCategories() {
    try {
      const response = await ebayApi.settings.getCategories()
      setCategories(response.data.data || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  async function loadListings() {
    try {
      const params: any = {}
      if (searchTerm) params.search = searchTerm
      if (filterStatus !== 'all') params.status = filterStatus
      if (filterCategory !== 'all') params.categoryId = filterCategory
      if (sortBy) params.sortBy = sortBy
      if (sortOrder) params.sortOrder = sortOrder

      const response = await ebayApi.listings.getAll(params)
      setListings(response.data.listings)
      
      calculateAnalytics(response.data.listings)
    } catch (error) {
      console.error('Failed to load listings:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateAnalytics(listingsData: any[]) {
    const totalValue = listingsData.reduce((sum, listing) => sum + (listing.currentPrice || 0), 0)
    const avgPrice = listingsData.length > 0 ? totalValue / listingsData.length : 0
    
    const listingsByStatus: Record<string, number> = {}
    const listingsByCategory: Record<string, number> = {}
    
    listingsData.forEach(listing => {
      const status = listing.listingStatus || listing.status || 'draft'
      listingsByStatus[status] = (listingsByStatus[status] || 0) + 1
      
      if (listing.category) {
        const catName = listing.category.name
        listingsByCategory[catName] = (listingsByCategory[catName] || 0) + 1
      }
    })

    const recentActivity = listingsData
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5)

    setAnalytics({
      totalValue,
      avgPrice,
      listingsByStatus,
      listingsByCategory,
      recentActivity
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-blue-100 text-blue-800',
      active_listing: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      sold: 'bg-green-100 text-green-800',
      ready_to_upload: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800',
      expired: 'bg-yellow-100 text-yellow-800',
    }
    return badges[status] || 'bg-blue-100 text-blue-800'
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this listing?')) return

    setDeleting(id)
    try {
      await ebayApi.listings.delete(id)
      setListings(listings.filter((l: any) => l.id !== id))
      loadStats()
    } catch (error: any) {
      console.error('Failed to delete listing:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error'
      alert('Failed to delete listing: ' + errorMessage)
    } finally {
      setDeleting(null)
    }
  }

  const getStatusChartData = () => {
    const data = analytics.listingsByStatus
    const max = Math.max(...Object.values(data), 1)
    return Object.entries(data).map(([status, count]) => ({
      status,
      count: count as number,
      percentage: ((count as number) / max) * 100
    }))
  }

  const getCategoryChartData = () => {
    const data = analytics.listingsByCategory
    const max = Math.max(...Object.values(data), 1)
    return Object.entries(data).slice(0, 5).map(([category, count]) => ({
      category,
      count: count as number,
      percentage: ((count as number) / max) * 100
    }))
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="eBay Automation"
        subtitle="Manage your eBay listings and automation"
      >
        <ShoppingCart className="h-8 w-8 text-cyan-600" />
      </DashboardHeader>
      <DashboardContent>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Overview of your eBay listings and performance</p>
            </div>
            <Link href="/dashboard/ebay/listings/new">
              <Button className="inline-flex items-center gap-2">
                <Plus size={20} />
                New Listing
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-cyan-100 rounded-lg">
                    <Package className="text-cyan-600" size={24} />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Listings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Activity className="text-green-600" size={24} />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Active</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <CheckCircle className="text-blue-600" size={24} />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Sold</p>
                <p className="text-3xl font-bold text-gray-900">{stats.sold}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="text-yellow-600" size={24} />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{stats.alerts}</p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="text-cyan-600" size={24} />
                  Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="text-cyan-600" size={20} />
                      <p className="text-gray-600 text-sm">Total Value</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      ${analytics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-cyan-600" size={20} />
                      <p className="text-gray-600 text-sm">Avg Price</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      ${analytics.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="text-cyan-600" size={24} />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getStatusChartData().map(({ status, count, percentage }) => (
                    <div key={status}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search listings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="ready_to_upload">Ready to Upload</option>
                    <option value="active_listing">Active</option>
                    <option value="sold">Sold</option>
                    <option value="archived">Archived</option>
                  </select>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent min-w-[160px]"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [by, order] = e.target.value.split('-')
                      setSortBy(by)
                      setSortOrder(order)
                    }}
                    className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent min-w-[150px]"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="title-asc">Title (A-Z)</option>
                    <option value="title-desc">Title (Z-A)</option>
                    <option value="code-asc">Code (A-Z)</option>
                    <option value="code-desc">Code (Z-A)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Listings Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent"></div>
                  <p className="text-gray-600 mt-4">Loading listings...</p>
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto text-gray-400" size={64} />
                  <p className="text-gray-600 mt-4 text-lg">No listings found</p>
                  <Link href="/dashboard/ebay/listings/new">
                    <Button className="mt-4 inline-flex items-center gap-2">
                      <Plus size={20} />
                      Create Your First Listing
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Condition</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {listings.map((listing: any) => {
                        const needsAgingAlert = listing.daysSinceCreated > 100
                        const needsInspectionAlert = listing.needsInspection || 
                          listing.needsTesting ||
                          listing.conditionText?.toLowerCase().includes('needs inspection') ||
                          listing.testStatus?.toLowerCase().includes('needs testing') ||
                          listing.conditionText?.toLowerCase().includes('bad condition')
                        
                        return (
                        <tr
                          key={listing.id}
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            needsAgingAlert ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''
                          } ${
                            needsInspectionAlert ? 'bg-red-50 border-l-4 border-red-500' : ''
                          }`}
                          onClick={() => router.push(`/dashboard/ebay/listings/${listing.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link 
                              href={`/dashboard/ebay/listings/${listing.id}`} 
                              className="text-cyan-600 hover:text-cyan-700 font-mono text-sm font-semibold"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {listing.code}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {listing.images && listing.images.length > 0 && listing.images[0]?.url ? (
                                <img
                                  src={listing.images[0].url}
                                  alt={listing.title || 'Listing image'}
                                  className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  <Package size={20} className="text-gray-400" />
                                </div>
                              )}
                              <span className="font-medium text-gray-900">
                                {listing.title || 'Untitled'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {listing.category ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                                {listing.category.name}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {listing.storageLocation ? listing.storageLocation.name : (listing.location || '-')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {listing.conditionText || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(listing.listingStatus || listing.status || 'draft')}`}>
                                {(listing.listingStatus || listing.status || 'draft').replace('_', ' ')}
                              </span>
                              {needsAgingAlert && (
                                <AlertTriangle className="h-4 w-4 text-yellow-600" title={`${listing.daysSinceCreated} days old`} />
                              )}
                              {needsInspectionAlert && (
                                <AlertTriangle className="h-4 w-4 text-red-600" title="Needs inspection or testing" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/dashboard/ebay/listings/${listing.id}`}
                                className="p-2 hover:bg-cyan-50 rounded-lg transition-colors text-cyan-600 hover:text-cyan-700"
                                title="Edit listing"
                              >
                                <Edit2 size={18} />
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(e, listing.id)}
                                disabled={deleting === listing.id}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete listing"
                              >
                                {deleting === listing.id ? (
                                  <div className="w-[18px] h-[18px] border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}
