'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, TrendingUp, CheckCircle, AlertTriangle, Plus, Search, Edit2, Trash2, DollarSign, Calendar, BarChart3, Activity } from 'lucide-react';
import { listings as listingsAPI, api } from '@/lib/api';
import { format } from 'date-fns';

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, sold: 0, alerts: 0 });
    const [listings, setListings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [deleting, setDeleting] = useState(null);
    const [analytics, setAnalytics] = useState({
        totalValue: 0,
        avgPrice: 0,
        listingsByStatus: {},
        listingsByCategory: {},
        recentActivity: []
    });

    useEffect(() => {
        loadStats();
        loadCategories();
        loadListings();
    }, []);

    useEffect(() => {
        loadListings();
    }, [searchTerm, filterStatus, filterCategory, sortBy, sortOrder]);

    async function loadStats() {
        try {
            const response = await listingsAPI.getStats();
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async function loadCategories() {
        try {
            const response = await api.settings.getCategories();
            setCategories(response.data.data || []);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    async function loadListings() {
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterStatus !== 'all') params.status = filterStatus;
            if (filterCategory !== 'all') params.categoryId = filterCategory;
            if (sortBy) params.sortBy = sortBy;
            if (sortOrder) params.sortOrder = sortOrder;

            const response = await listingsAPI.getAll(params);
            setListings(response.data.listings);
            
            // Calculate analytics
            calculateAnalytics(response.data.listings);
        } catch (error) {
            console.error('Failed to load listings:', error);
        } finally {
            setLoading(false);
        }
    }

    function calculateAnalytics(listingsData) {
        const totalValue = listingsData.reduce((sum, listing) => sum + (listing.currentPrice || 0), 0);
        const avgPrice = listingsData.length > 0 ? totalValue / listingsData.length : 0;
        
        const listingsByStatus = {};
        const listingsByCategory = {};
        
        listingsData.forEach(listing => {
            const status = listing.listingStatus || listing.status || 'draft';
            listingsByStatus[status] = (listingsByStatus[status] || 0) + 1;
            
            if (listing.category) {
                const catName = listing.category.name;
                listingsByCategory[catName] = (listingsByCategory[catName] || 0) + 1;
            }
        });

        const recentActivity = listingsData
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5);

        setAnalytics({
            totalValue,
            avgPrice,
            listingsByStatus,
            listingsByCategory,
            recentActivity
        });
    }

    const getStatusBadge = (status) => {
        const badges = {
            draft: 'badge-info',
            active_listing: 'badge-success',
            active: 'badge-success',
            sold: 'badge-success',
            ready_to_upload: 'badge-warning',
            archived: 'badge-gray',
            expired: 'badge-warning',
        };
        return badges[status] || 'badge-info';
    };

    const getAlertStyle = (listing) => {
        const daysSince = listing.daysSincePosted || listing.daysSinceCreated || 0;
        if (daysSince >= 100) {
            return 'bg-yellow-500/10 border-l-4 border-yellow-500';
        }
        return '';
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('Are you sure you want to delete this listing?')) return;

        setDeleting(id);
        try {
            await listingsAPI.delete(id);
            setListings(listings.filter(l => l.id !== id));
            loadStats();
        } catch (error) {
            console.error('Failed to delete listing:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
            alert('Failed to delete listing: ' + errorMessage);
        } finally {
            setDeleting(null);
        }
    };

    // Chart data helpers
    const getStatusChartData = () => {
        const data = analytics.listingsByStatus;
        const max = Math.max(...Object.values(data), 1);
        return Object.entries(data).map(([status, count]) => ({
            status,
            count,
            percentage: (count / max) * 100
        }));
    };

    const getCategoryChartData = () => {
        const data = analytics.listingsByCategory;
        const max = Math.max(...Object.values(data), 1);
        return Object.entries(data).slice(0, 5).map(([category, count]) => ({
            category,
            count,
            percentage: (count / max) * 100
        }));
    };

    return (
        <div className="min-h-screen bg-[#0F0F0F]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-[#E5E5E5] mb-2">Dashboard</h1>
                        <p className="text-gray-400">Overview of your eBay listings and performance</p>
                    </div>
                    <Link 
                        href="/listings/new" 
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#22B8CF] hover:bg-[#2DD4BF] text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
                    >
                        <Plus size={20} />
                        New Listing
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-[#22B8CF]/20 rounded-lg">
                                <Package className="text-[#22B8CF]" size={24} />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm font-medium mb-1">Total Listings</p>
                        <p className="text-3xl font-bold text-[#E5E5E5]">{stats.total}</p>
                    </div>

                    <div className="bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-500/20 rounded-lg">
                                <Activity className="text-green-400" size={24} />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm font-medium mb-1">Active</p>
                        <p className="text-3xl font-bold text-[#E5E5E5]">{stats.active}</p>
                    </div>

                    <div className="bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-lg">
                                <CheckCircle className="text-blue-400" size={24} />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm font-medium mb-1">Sold</p>
                        <p className="text-3xl font-bold text-[#E5E5E5]">{stats.sold}</p>
                    </div>

                    <div className="bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-yellow-500/20 rounded-lg">
                                <AlertTriangle className="text-yellow-400" size={24} />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm font-medium mb-1">Alerts</p>
                        <p className="text-3xl font-bold text-[#E5E5E5]">{stats.alerts}</p>
                    </div>
                </div>

                {/* Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Total Value & Average Price */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="text-[#22B8CF]" size={24} />
                            <h2 className="text-xl font-bold text-[#E5E5E5]">Financial Overview</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2A2A2A]">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="text-[#22B8CF]" size={20} />
                                    <p className="text-gray-400 text-sm">Total Value</p>
                                </div>
                                <p className="text-2xl font-bold text-[#E5E5E5]">
                                    ${analytics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2A2A2A]">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="text-[#22B8CF]" size={20} />
                                    <p className="text-gray-400 text-sm">Avg Price</p>
                                </div>
                                <p className="text-2xl font-bold text-[#E5E5E5]">
                                    ${analytics.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="text-[#22B8CF]" size={24} />
                            <h2 className="text-xl font-bold text-[#E5E5E5]">Status Distribution</h2>
                        </div>
                        <div className="space-y-4">
                            {getStatusChartData().map(({ status, count, percentage }) => (
                                <div key={status}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-400 capitalize">{status.replace('_', ' ')}</span>
                                        <span className="text-sm font-semibold text-[#E5E5E5]">{count}</span>
                                    </div>
                                    <div className="w-full bg-[#0F0F0F] rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#22B8CF] to-[#2DD4BF] rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Category Distribution */}
                {Object.keys(analytics.listingsByCategory).length > 0 && (
                    <div className="bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-6">
                            <Package className="text-[#22B8CF]" size={24} />
                            <h2 className="text-xl font-bold text-[#E5E5E5]">Top Categories</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {getCategoryChartData().map(({ category, count }) => (
                                <div key={category} className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2A2A2A] text-center">
                                    <p className="text-2xl font-bold text-[#22B8CF] mb-1">{count}</p>
                                    <p className="text-sm text-gray-400 truncate">{category}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl p-4 shadow-lg">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search listings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-[#E5E5E5] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#22B8CF] focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#22B8CF] focus:border-transparent min-w-[140px]"
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
                                className="px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#22B8CF] focus:border-transparent min-w-[160px]"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [by, order] = e.target.value.split('-');
                                    setSortBy(by);
                                    setSortOrder(order);
                                }}
                                className="px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#22B8CF] focus:border-transparent min-w-[150px]"
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
                </div>

                {/* Listings Table */}
                <div className="bg-gradient-to-br from-[#1E1E1E] to-[#222] border border-[#2A2A2A] rounded-xl shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#22B8CF] border-t-transparent"></div>
                            <p className="text-gray-400 mt-4">Loading listings...</p>
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="mx-auto text-gray-600" size={64} />
                            <p className="text-gray-400 mt-4 text-lg">No listings found</p>
                            <Link href="/listings/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                                <Plus size={20} />
                                Create Your First Listing
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#0F0F0F] border-b border-[#2A2A2A]">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Title</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Condition</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2A2A2A]">
                                        {listings.map((listing) => (
                                            <tr
                                                key={listing.id}
                                                className={`hover:bg-[#2A2A2A]/50 transition-colors cursor-pointer ${getAlertStyle(listing)}`}
                                                onClick={() => router.push(`/listings/${listing.id}`)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Link 
                                                        href={`/listings/${listing.id}`} 
                                                        className="text-[#22B8CF] hover:text-[#2DD4BF] font-mono text-sm font-semibold"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {listing.code}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {listing.images && listing.images.length > 0 && listing.images[0]?.url ? (
                                                            <img
                                                                src={listing.images[0].url.startsWith('http') 
                                                                    ? listing.images[0].url 
                                                                    : `http://192.168.10.70:5000${listing.images[0].url}`}
                                                                alt={listing.title || 'Listing image'}
                                                                className="w-12 h-12 rounded-lg object-cover bg-[#0F0F0F] border border-[#2A2A2A]"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center">
                                                                <Package size={20} className="text-gray-600" />
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-[#E5E5E5]">
                                                            {listing.title || 'Untitled'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {listing.category ? (
                                                        <span className="px-2 py-1 text-xs rounded-full bg-[#22B8CF]/20 text-[#22B8CF] border border-[#22B8CF]/30">
                                                            {listing.category.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {listing.storageLocation ? listing.storageLocation.name : (listing.location || '-')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {listing.conditionText || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`badge ${getStatusBadge(listing.listingStatus || listing.status)}`}>
                                                        {(listing.listingStatus || listing.status || 'draft').replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/listings/${listing.id}`}
                                                            className="p-2 hover:bg-[#22B8CF]/20 rounded-lg transition-colors text-[#22B8CF] hover:text-[#2DD4BF]"
                                                            title="Edit listing"
                                                        >
                                                            <Edit2 size={18} />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDelete(e, listing.id)}
                                                            disabled={deleting === listing.id}
                                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Delete listing"
                                                        >
                                                            {deleting === listing.id ? (
                                                                <div className="w-[18px] h-[18px] border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <Trash2 size={18} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden p-4 space-y-4">
                                {listings.map((listing) => (
                                    <div
                                        key={listing.id}
                                        className={`bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg p-4 cursor-pointer hover:bg-[#2A2A2A] transition-colors ${getAlertStyle(listing)}`}
                                        onClick={() => router.push(`/listings/${listing.id}`)}
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            {listing.images && listing.images.length > 0 && listing.images[0]?.url ? (
                                                <img
                                                    src={listing.images[0].url.startsWith('http') 
                                                        ? listing.images[0].url 
                                                        : `http://192.168.10.70:5000${listing.images[0].url}`}
                                                    alt={listing.title || 'Listing image'}
                                                    className="w-16 h-16 rounded-lg object-cover bg-[#0F0F0F] border border-[#2A2A2A] flex-shrink-0"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                                                    <Package size={24} className="text-gray-600" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <Link 
                                                    href={`/listings/${listing.id}`} 
                                                    className="text-[#22B8CF] hover:text-[#2DD4BF] font-mono text-xs mb-1 block"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {listing.code}
                                                </Link>
                                                <h3 className="font-semibold text-[#E5E5E5] truncate mb-2">{listing.title || 'Untitled'}</h3>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`badge ${getStatusBadge(listing.listingStatus || listing.status)} text-xs`}>
                                                        {(listing.listingStatus || listing.status || 'draft').replace('_', ' ')}
                                                    </span>
                                                    {listing.category && (
                                                        <span className="px-2 py-1 text-xs rounded-full bg-[#22B8CF]/20 text-[#22B8CF] border border-[#22B8CF]/30">
                                                            {listing.category.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]" onClick={(e) => e.stopPropagation()}>
                                            <div className="text-xs text-gray-400">
                                                <p>{listing.storageLocation ? listing.storageLocation.name : (listing.location || 'No location')}</p>
                                                <p>{listing.conditionText || 'No condition'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/listings/${listing.id}`}
                                                    className="p-2 hover:bg-[#22B8CF]/20 rounded-lg transition-colors text-[#22B8CF]"
                                                >
                                                    <Edit2 size={18} />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDelete(e, listing.id)}
                                                    disabled={deleting === listing.id}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 disabled:opacity-50"
                                                >
                                                    {deleting === listing.id ? (
                                                        <div className="w-[18px] h-[18px] border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Trash2 size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
