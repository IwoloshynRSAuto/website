'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader, CheckCircle, X } from 'lucide-react';
import axios from 'axios';
import { api } from '@/lib/api';

// Get API URL
function getApiUrl() {
    if (typeof window !== 'undefined' && window.API_CONFIG?.API_URL) {
        return window.API_CONFIG.API_URL;
    }
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }
    return `http://${hostname}:5000`;
}

export default function NewListingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [listingId, setListingId] = useState(null);
    const [listingCode, setListingCode] = useState('');
    const [generatedTitle, setGeneratedTitle] = useState('');
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        categoryId: '',
        storageLocationId: '',
        condition: '',
        testStatus: '',
        notes: ''
    });

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const [locRes, catRes] = await Promise.all([
                api.settings.getLocations(),
                api.settings.getCategories()
            ]);
            setLocations(locRes.data.data || []);
            setCategories(catRes.data.data || []);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
    }

    function handleDrop(e) {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        setSelectedFiles(files);
    }

    function handleDragOver(e) {
        e.preventDefault();
    }

    function removeFile(index) {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }

    async function handleUploadAndGenerate() {
        if (selectedFiles.length === 0) {
            alert('Please select at least one image');
            return;
        }

        if (selectedFiles.length > 10) {
            alert('Maximum 10 images allowed');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('images', file);
            });

            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/listing/create`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 60000 // 60 second timeout for AI processing
            });

            const { id, code, title, imageCount } = response.data.data;
            setListingId(id);
            setListingCode(code);
            setGeneratedTitle(title);
            setFormData(prev => ({ ...prev, title: title })); // Set initial title
            setStep(2);
        } catch (error) {
            console.error('Error creating listing:', error);
            let errorMessage = 'Failed to create listing';
            
            if (error.response?.data) {
                const data = error.response.data;
                
                // Handle nested error structure: { error: { message: "..." } }
                if (data.error) {
                    if (typeof data.error === 'string') {
                        errorMessage = data.error;
                    } else if (data.error.message) {
                        errorMessage = data.error.message;
                    } else {
                        errorMessage = JSON.stringify(data.error);
                    }
                } 
                // Handle direct error string
                else if (typeof data === 'string') {
                    errorMessage = data;
                }
                // Handle message field
                else if (data.message) {
                    errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
                }
                // Fallback to stringify
                else {
                    errorMessage = JSON.stringify(data);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(`Failed to create listing: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveListing() {
        if (!listingId) {
            alert('Listing ID missing');
            return;
        }

        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/listing/update/${listingId}`, {
                title: formData.title || generatedTitle, // Ensure title is included
                categoryId: formData.categoryId || null,
                storageLocationId: formData.storageLocationId || null,
                condition: formData.condition,
                testStatus: formData.testStatus,
                notes: formData.notes
            });

            // Redirect to listing detail or dashboard
            router.push(`/listings/${listingId}`);
        } catch (error) {
            console.error('Error saving listing:', error);
            let errorMessage = 'Failed to save listing';
            
            if (error.response?.data) {
                const data = error.response.data;
                
                // Handle nested error structure: { error: { message: "..." } }
                if (data.error) {
                    if (typeof data.error === 'string') {
                        errorMessage = data.error;
                    } else if (data.error.message) {
                        errorMessage = data.error.message;
                    } else {
                        errorMessage = JSON.stringify(data.error);
                    }
                } 
                // Handle direct error string
                else if (typeof data === 'string') {
                    errorMessage = data;
                }
                // Handle message field
                else if (data.message) {
                    errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
                }
                // Fallback to stringify
                else {
                    errorMessage = JSON.stringify(data);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(`Failed to save listing: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-[#E5E5E5]">
                    Create New Listing
                </h1>
                <p className="text-gray-400 mt-2">Upload images and let AI generate the title</p>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-between">
                {[
                    { num: 1, title: 'Upload Images' },
                    { num: 2, title: 'Add Details' }
                ].map(({ num, title }) => (
                    <div key={num} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
              ${step >= num ? 'bg-[#22B8CF] text-white' : 'bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400'}`}>
                            {num}
                        </div>
                        <span className={step >= num ? 'text-[#E5E5E5] font-medium' : 'text-gray-400'}>{title}</span>
                    </div>
                ))}
            </div>

            {/* Step 1: Upload Images */}
            {step === 1 && (
                <div className="card space-y-6 animate-slide-up">
                    <div className="text-center">
                        <Upload className="mx-auto text-[#22B8CF]" size={64} />
                        <h2 className="text-2xl font-bold mt-4 text-[#E5E5E5]">Upload Product Images</h2>
                        <p className="text-gray-400 mt-2">Upload 1-10 images. AI will generate a title automatically.</p>
                    </div>

                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-12 text-center hover:border-[#22B8CF] transition-colors cursor-pointer"
                    >
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="mx-auto text-[#22B8CF] mb-4" size={64} />
                            <p className="text-xl font-semibold mb-2 text-[#E5E5E5]">Drop images here or click to browse</p>
                            <p className="text-gray-400">Support for JPG, PNG, WebP (max 10 images, 10MB each)</p>
                        </label>
                    </div>


                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                        <div>
                            <p className="text-sm text-gray-400 mb-3">{selectedFiles.length} image(s) selected:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {selectedFiles.map((file, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={file.name}
                                            className="w-full h-32 object-cover rounded-lg border border-[#2A2A2A]"
                                        />
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={16} className="text-white" />
                                        </button>
                                        <p className="text-xs text-gray-400 mt-1 truncate">{file.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleUploadAndGenerate}
                        disabled={loading || selectedFiles.length === 0}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Uploading & Generating Title...
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                Upload Images & Generate Title
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Step 2: Add Details */}
            {step === 2 && (
                <div className="card space-y-6 animate-slide-up">
                    <div className="text-center">
                        <div className="inline-block px-6 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-full mb-4">
                            <span className="font-mono text-lg font-bold text-[#22B8CF]">{listingCode}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-[#E5E5E5]">Add Listing Details</h2>
                        <p className="text-gray-400 mt-2">Complete the listing information</p>
                    </div>

                    {/* Title Field (Editable) */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-[#E5E5E5]">
                            Title <span className="text-gray-400 text-xs">(AI Generated - Editable)</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Enter listing title..."
                            className="input-field"
                        />
                        {generatedTitle && formData.title !== generatedTitle && (
                            <p className="text-xs text-gray-400 mt-1">Original AI title: {generatedTitle}</p>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[#E5E5E5]">
                                Category
                            </label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                className="input-field"
                            >
                                <option value="">Select category...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[#E5E5E5]">
                                Storage Location
                            </label>
                            <select
                                value={formData.storageLocationId}
                                onChange={(e) => setFormData({ ...formData, storageLocationId: e.target.value })}
                                className="input-field"
                            >
                                <option value="">Select location...</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name} {loc.code ? `(${loc.code})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[#E5E5E5]">
                                Condition
                            </label>
                            <select
                                value={formData.condition}
                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                className="input-field"
                            >
                                <option value="">Select condition...</option>
                                <option value="New">New</option>
                                <option value="Like New">Like New</option>
                                <option value="Used">Used</option>
                                <option value="For Parts">For Parts</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[#E5E5E5]">
                                Test / Repair Status
                            </label>
                            <select
                                value={formData.testStatus}
                                onChange={(e) => setFormData({ ...formData, testStatus: e.target.value })}
                                className="input-field"
                            >
                                <option value="">Select status...</option>
                                <option value="Needs Testing">Needs Testing</option>
                                <option value="Tested Working">Tested Working</option>
                                <option value="Needs Repair">Needs Repair</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-[#E5E5E5]">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional notes about this listing..."
                                rows={4}
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep(1)}
                            className="btn-secondary flex-1"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSaveListing}
                            disabled={loading}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    Save Listing
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
