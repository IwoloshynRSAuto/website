'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, TrendingUp, AlertTriangle, ExternalLink, Edit, Save, Loader, Trash2, Package } from 'lucide-react';
import Link from 'next/link';
import { listings as listingsAPI, ebay, api } from '@/lib/api';

export default function ListingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [listing, setListing] = useState(null);
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [conditions, setConditions] = useState([]);

    useEffect(() => {
        if (params.id) {
            loadData();
        }
        loadSettings();
    }, [params.id]);

    async function loadSettings() {
        try {
            const [catRes, locRes, condRes] = await Promise.all([
                api.settings.getCategories(),
                api.settings.getLocations(),
                api.settings.getConditions()
            ]);
            setCategories(catRes.data.data || []);
            setLocations(locRes.data.data || []);
            setConditions(condRes.data.data || []);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Debug: Log images when listing changes
    useEffect(() => {
        if (listing) {
            console.log('[Listing Detail] Listing loaded:', listing.id);
            console.log('[Listing Detail] Images array:', listing.images);
            console.log('[Listing Detail] Images count:', listing.images?.length || 0);
            if (listing.images && listing.images.length > 0) {
                listing.images.forEach((img, idx) => {
                    const fullUrl = `http://192.168.10.70:5000${img.url}`;
                    console.log(`[Listing Detail] Image ${idx + 1}:`, {
                        id: img.id,
                        url: img.url,
                        fullUrl: fullUrl,
                        filename: img.filename
                    });
                });
            } else {
                console.warn('[Listing Detail] No images found for listing:', listing.id);
            }
        }
    }, [listing]);

    async function loadData() {
        try {
            const response = await listingsAPI.getById(params.id);
            console.log('[Listing Detail] Loaded listing:', response.data.data);
            console.log('[Listing Detail] Images:', response.data.data.images);
            setListing(response.data.data);
            setEditData({
                title: response.data.data.title || '',
                description: response.data.data.description || '',
                currentPrice: response.data.data.currentPrice || '',
                status: response.data.data.listingStatus || response.data.data.status || 'draft',
                categoryId: response.data.data.categoryId || response.data.data.category?.id || '',
                storageLocationId: response.data.data.storageLocationId || response.data.data.storageLocation?.id || '',
                conditionText: response.data.data.conditionText || response.data.data.condition?.name || '',
                testStatus: response.data.data.testStatus || '',
                notes: response.data.data.notes || ''
            });

            // Load pricing suggestions
            try {
                const pricingRes = await listingsAPI.getPricing(params.id);
                setPricing(pricingRes.data.data);
            } catch (err) {
                console.error('Pricing error:', err);
            }
        } catch (error) {
            console.error('Error loading listing:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        try {
            setLoading(true);
            // Use the new v2 endpoint for updating
            const apiUrl = typeof window !== 'undefined' && window.API_CONFIG?.API_URL 
                ? window.API_CONFIG.API_URL 
                : (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                    ? 'http://localhost:5000' 
                    : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000`);
            
            await fetch(`${apiUrl}/api/listing/update/${params.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editData.title,
                    categoryId: editData.categoryId || null,
                    storageLocationId: editData.storageLocationId || null,
                    condition: editData.conditionText,
                    testStatus: editData.testStatus,
                    notes: editData.notes,
                    listingStatus: editData.status
                })
            });
            
            setEditing(false);
            loadData();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Failed to save changes');
        } finally {
            setLoading(false);
        }
    }

    async function handleUploadToEbay() {
        try {
            setUploading(true);
            await ebay.uploadListing(params.id, 1);
            alert('Listing uploaded to eBay successfully!');
            loadData();
        } catch (error) {
            console.error('Error uploading to eBay:', error);
            alert('Failed to upload to eBay: ' + (error.response?.data?.error || error.message));
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
            return;
        }

        try {
            setDeleting(true);
            const response = await listingsAPI.delete(params.id);
            console.log('Delete response:', response);
            router.push('/');
        } catch (error) {
            console.error('Error deleting listing:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
            alert('Failed to delete listing: ' + errorMessage);
            setDeleting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader className="animate-spin text-primary-500" size={48} />
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400 text-lg">Listing not found</p>
                <Link href="/" className="btn-primary mt-4 inline-block">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <Link href="/" className="btn-secondary p-2 flex-shrink-0">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold truncate">{editing ? 'Edit Listing' : listing.title || 'Untitled Listing'}</h1>
                        <p className="text-gray-400 mt-1 font-mono text-sm">{listing.code}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3">
                    {!editing ? (
                        <>
                            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
                                <Edit size={18} />
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="btn-secondary flex items-center gap-2 hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
                            >
                                {deleting ? (
                                    <>
                                        <Loader className="animate-spin" size={18} />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        Delete
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleUploadToEbay}
                                disabled={uploading || listing.ebayData?.ebayListingId}
                                className="btn-primary flex items-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader className="animate-spin" size={18} />
                                        Uploading...
                                    </>
                                ) : listing.ebayData?.ebayListingId ? (
                                    <a
                                        href={listing.ebayData.listingUrl || `https://www.ebay.com/itm/${listing.ebayData.ebayListingId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        <ExternalLink size={18} />
                                        View on eBay
                                    </a>
                                ) : (
                                    <>
                                        <ExternalLink size={18} />
                                        Upload to eBay
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setEditing(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                                <Save size={18} />
                                Save Changes
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Alerts */}
            {listing.alerts && listing.alerts.length > 0 && (
                <div className="space-y-3">
                    {listing.alerts.map(alert => (
                        <div key={alert.id} className={`card ${alert.severity === 'error' ? 'bg-red-500/10 border-red-500/30' :
                            alert.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                'bg-blue-500/10 border-blue-500/30'
                            }`}>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className={alert.severity === 'error' ? 'text-red-400' : 'text-yellow-400'} size={24} />
                                <div className="flex-1">
                                    <p className="font-semibold">{alert.message}</p>
                                    {alert.suggestedAction && (
                                        <p className="text-sm text-gray-400 mt-1">💡 {alert.suggestedAction}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Images */}
                    <div className="card">
                        <h3 className="text-xl font-bold mb-4">Images ({listing.images?.length || 0})</h3>
                        {listing.images && Array.isArray(listing.images) && listing.images.length > 0 ? (
                            <div className="space-y-4">
                                {/* Main large image */}
                                {listing.images[0]?.url ? (
                                    <div className="relative bg-dark-800 rounded-lg overflow-hidden flex items-center justify-center w-full" style={{ minHeight: '250px', maxHeight: '70vh' }}>
                                        <img
                                            key={`main-${listing.images[0].id}-${Date.now()}`}
                                            src={`http://192.168.10.70:5000${listing.images[0].url}`}
                                            alt={listing.title || 'Listing image'}
                                            className="main-listing-image w-full h-auto max-h-full object-contain bg-dark-800"
                                            style={{ display: 'block', maxWidth: '100%' }}
                                            crossOrigin="anonymous"
                                            onLoad={(e) => {
                                                console.log('[Image] ✅ Main image loaded successfully:', `http://192.168.10.70:5000${listing.images[0].url}`);
                                                e.target.style.opacity = '1';
                                            }}
                                            onError={(e) => {
                                                const imageUrl = `http://192.168.10.70:5000${listing.images[0].url}`;
                                                console.error('[Image] ❌ Failed to load main image:', imageUrl);
                                                console.error('[Image] Error details:', {
                                                    url: imageUrl,
                                                    naturalWidth: e.target.naturalWidth,
                                                    naturalHeight: e.target.naturalHeight,
                                                    complete: e.target.complete,
                                                    error: e.target.error
                                                });
                                                e.target.style.display = 'none';
                                                const placeholder = e.target.parentElement.querySelector('.image-placeholder');
                                                if (placeholder) placeholder.style.display = 'flex';
                                            }}
                                        />
                                        <div className="image-placeholder hidden absolute inset-0 items-center justify-center bg-dark-800">
                                            <div className="text-center">
                                                <Package size={64} className="mx-auto text-gray-600 mb-2" />
                                                <p className="text-gray-400 text-sm">Image failed to load</p>
                                                <p className="text-gray-500 text-xs mt-1 break-all px-4">{listing.images[0].url}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-dark-800 rounded-lg p-12 text-center" style={{ minHeight: '250px' }}>
                                        <Package size={64} className="mx-auto text-gray-600 mb-4" />
                                        <p className="text-gray-400">First image URL is missing</p>
                                    </div>
                                )}
                                
                                {/* Thumbnail grid for additional images */}
                                {listing.images.length > 1 && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                                        {listing.images.map((img, index) => {
                                            const imageUrl = `http://192.168.10.70:5000${img.url}`;
                                            return (
                                                <div
                                                    key={img.id}
                                                    className="relative bg-dark-800 rounded-lg overflow-hidden cursor-pointer active:ring-2 active:ring-primary-400 hover:ring-2 hover:ring-primary-400 transition-all touch-manipulation"
                                                    style={{ aspectRatio: '1', minHeight: '60px' }}
                                                    onClick={() => {
                                                        // Swap main image with clicked thumbnail
                                                        const mainImg = document.querySelector('.main-listing-image');
                                                        if (mainImg) {
                                                            console.log('[Image] Switching to:', imageUrl);
                                                            mainImg.src = imageUrl;
                                                        }
                                                    }}
                                                >
                                                    <img
                                                        src={imageUrl}
                                                        alt={`${listing.title || 'Listing'} - Image ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                        crossOrigin="anonymous"
                                                        onLoad={() => {
                                                            console.log('[Image] Thumbnail loaded:', imageUrl);
                                                        }}
                                                        onError={(e) => {
                                                            console.error('[Image] Thumbnail failed:', imageUrl);
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                    {index === 0 && (
                                                        <div className="absolute top-1 left-1 bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded">
                                                            Main
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-dark-800 rounded-lg p-12 text-center" style={{ minHeight: '300px' }}>
                                <Package size={64} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400">No images uploaded for this listing</p>
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="card space-y-4">
                        <h3 className="text-xl font-bold">Details</h3>

                        {editing ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={editData.title}
                                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Description</label>
                                    <textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        rows={6}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editData.currentPrice}
                                        onChange={(e) => setEditData({ ...editData, currentPrice: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                        <div>
                                            <p className="text-sm text-gray-400">Description</p>
                                            <p className="mt-1 whitespace-pre-wrap">
                                                {listing.description || 'No description'}
                                            </p>
                                        </div>
                            </>
                        )}
                    </div>

                    {/* AI Analysis - Desktop Only (mobile shows in sidebar) */}
                    {listing.aiAnalysis && (
                        <div className="card space-y-4 hidden lg:block">
                            <h3 className="text-xl font-bold">AI Analysis</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-400">Brand</p>
                                    <p className="font-semibold text-white">
                                        {listing.aiAnalysis.detectedBrand || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Model</p>
                                    <p className="font-semibold text-white">
                                        {listing.aiAnalysis.detectedModel || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Category</p>
                                    <p className="font-semibold text-white break-words">
                                        {listing.aiAnalysis.suggestedCategory || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Confidence</p>
                                    <p className="font-semibold text-green-400 text-lg">
                                        {(listing.aiAnalysis.confidenceScore * 100).toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6 order-first lg:order-last">
                    {/* AI Analysis - Mobile Priority (shown on mobile, hidden on desktop since it's in main content) */}
                    {listing.aiAnalysis && (
                        <div className="card space-y-4 lg:hidden">
                            <h3 className="text-xl font-bold">AI Analysis</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-400">Brand</p>
                                    <p className="font-semibold text-white">
                                        {listing.aiAnalysis.detectedBrand || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Model</p>
                                    <p className="font-semibold text-white">
                                        {listing.aiAnalysis.detectedModel || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Category</p>
                                    <p className="font-semibold text-white break-words">
                                        {listing.aiAnalysis.suggestedCategory || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Confidence</p>
                                    <p className="font-semibold text-green-400 text-lg">
                                        {(listing.aiAnalysis.confidenceScore * 100).toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="card space-y-4">
                        <h3 className="text-xl font-bold">Information</h3>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Category</p>
                            {editing ? (
                                <select
                                    value={editData.categoryId || ''}
                                    onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">Select category...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="font-semibold">{listing.category?.name || 'Not set'}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Storage Location</p>
                            {editing ? (
                                <select
                                    value={editData.storageLocationId || ''}
                                    onChange={(e) => setEditData({ ...editData, storageLocationId: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">Select location...</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name} {loc.code ? `(${loc.code})` : ''}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="font-semibold">{listing.storageLocation?.name || 'Not set'}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Condition</p>
                            {editing ? (
                                <select
                                    value={editData.conditionText || ''}
                                    onChange={(e) => setEditData({ ...editData, conditionText: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">Select condition...</option>
                                    <option value="New">New</option>
                                    <option value="Like New">Like New</option>
                                    <option value="Used">Used</option>
                                    <option value="For Parts">For Parts</option>
                                </select>
                            ) : (
                                <p className="font-semibold">{listing.conditionText || listing.condition?.name || 'Not set'}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Test / Repair Status</p>
                            {editing ? (
                                <select
                                    value={editData.testStatus || ''}
                                    onChange={(e) => setEditData({ ...editData, testStatus: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">Select status...</option>
                                    <option value="Needs Testing">Needs Testing</option>
                                    <option value="Tested Working">Tested Working</option>
                                    <option value="Needs Repair">Needs Repair</option>
                                </select>
                            ) : (
                                <p className="font-semibold">{listing.testStatus || 'Not set'}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Listing Status</p>
                            {editing ? (
                                <select
                                    value={editData.status}
                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="ready_to_upload">Ready to Upload</option>
                                    <option value="active_listing">Active Listing</option>
                                    <option value="sold">Sold</option>
                                    <option value="archived">Archived</option>
                                </select>
                            ) : (
                                <span className={`badge ${listing.listingStatus === 'active_listing' ? 'badge-success' :
                                    listing.listingStatus === 'draft' ? 'badge-info' :
                                        'badge-warning'
                                    }`}>
                                    {listing.listingStatus || listing.status || 'draft'}
                                </span>
                            )}
                        </div>
                        {editing && (
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Notes</p>
                                <textarea
                                    value={editData.notes || ''}
                                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                    className="input-field"
                                    rows={3}
                                    placeholder="Additional notes..."
                                />
                            </div>
                        )}
                        {listing.daysSincePosted && (
                            <div>
                                <p className="text-sm text-gray-400">Days Since Posted</p>
                                <p className="font-semibold">{listing.daysSincePosted}</p>
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
                            {pricing && (
                                <div className="card space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <DollarSign size={20} />
                                            Pricing Suggestions
                                        </h3>
                                    </div>
                            <div className="space-y-3">
                                <div className="p-3 bg-green-500/10 rounded-lg">
                                    <p className="text-sm text-gray-400">Suggested Price</p>
                                    <p className="text-2xl font-bold text-green-400">${pricing.suggestedPrice}</p>
                                    <p className="text-xs text-gray-500 mt-1">Confidence: {(pricing.confidence * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-3 bg-blue-500/10 rounded-lg">
                                    <p className="text-sm text-gray-400">Auction Start</p>
                                    <p className="text-xl font-bold text-blue-400">${pricing.auctionStartPrice}</p>
                                </div>
                                <div className="p-3 bg-purple-500/10 rounded-lg">
                                    <p className="text-sm text-gray-400">Shipping</p>
                                    <p className="text-xl font-bold text-purple-400">${pricing.suggestedShipping}</p>
                                </div>
                            </div>

                            {pricing.markdownSuggestion && (
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                    <p className="text-sm font-semibold text-yellow-400">Markdown Suggestion</p>
                                    <p className="text-sm mt-1">{pricing.markdownSuggestion.reason}</p>
                                    <p className="text-lg font-bold text-yellow-300 mt-2">
                                        -{pricing.markdownSuggestion.percent}% → ${pricing.markdownSuggestion.newPrice.toFixed(2)}
                                    </p>
                                </div>
                            )}

                            {pricing.marketData && (
                                <div>
                                    <p className="text-sm font-semibold mb-2">Market Data</p>
                                    <div className="text-sm space-y-1">
                                        <p className="text-gray-400">Sold: {pricing.marketData.soldListings.count} items</p>
                                        <p className="text-gray-400">Active: {pricing.marketData.activeListings.count} items</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

