'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, Mail, Phone, Globe, Package } from 'lucide-react'

interface VendorResult {
  vendor: {
    id: string
    name: string
    contactName: string | null
    email: string | null
    phone: string | null
    website: string | null
  }
  contactInfo: {
    name: string | null
    email: string | null
    phone: string | null
    website: string | null
  }
  lowestPrice: number | null
  partsAvailable: number
}

interface BrandResult {
  brand: string
  vendors: VendorResult[]
}

export function PartBrandLookupPanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<'part' | 'brand'>('part')
  const [results, setResults] = useState<BrandResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert('Please enter a search term')
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchType === 'brand') {
        params.append('brand', searchTerm)
      } else {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/parts/brand-lookup?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setResults(data.data.results || [])
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Search failed')
      }
    } catch (error) {
      console.error('Error searching:', error)
      alert('An error occurred during search')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Part & Brand Lookup</h2>
        <p className="text-sm text-gray-600 mt-1">
          Search for parts by part number, name, or brand to find vendors and contact information
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="search-part"
                  name="searchType"
                  checked={searchType === 'part'}
                  onChange={() => setSearchType('part')}
                  className="w-4 h-4"
                />
                <Label htmlFor="search-part" className="cursor-pointer">
                  Search by Part Number/Name
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="search-brand"
                  name="searchType"
                  checked={searchType === 'brand'}
                  onChange={() => setSearchType('brand')}
                  className="w-4 h-4"
                />
                <Label htmlFor="search-brand" className="cursor-pointer">
                  Search by Brand
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder={
                    searchType === 'brand'
                      ? 'Enter brand name (e.g., Allen-Bradley, Siemens)'
                      : 'Enter part number or name'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading || !searchTerm.trim()}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Searching...
          </CardContent>
        </Card>
      ) : results.length === 0 && searchTerm ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No results found for "{searchTerm}"
          </CardContent>
        </Card>
      ) : (
        results.map((brandResult) => (
          <Card key={brandResult.brand}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                {brandResult.brand}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brandResult.vendors.map((vendorResult, idx) => (
                  <div
                    key={`${vendorResult.vendor.id}-${idx}`}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">
                          {vendorResult.vendor.name}
                        </h3>

                        {/* Contact Information */}
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          {vendorResult.contactInfo.name && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Contact:</span>
                              <span>{vendorResult.contactInfo.name}</span>
                            </div>
                          )}
                          {vendorResult.contactInfo.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <a
                                href={`mailto:${vendorResult.contactInfo.email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {vendorResult.contactInfo.email}
                              </a>
                            </div>
                          )}
                          {vendorResult.contactInfo.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <a
                                href={`tel:${vendorResult.contactInfo.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {vendorResult.contactInfo.phone}
                              </a>
                            </div>
                          )}
                          {vendorResult.contactInfo.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              <a
                                href={vendorResult.contactInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {vendorResult.contactInfo.website}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Pricing and Availability */}
                        <div className="flex items-center gap-4 text-sm">
                          {vendorResult.lowestPrice !== null && (
                            <div>
                              <span className="text-gray-600">Lowest Price: </span>
                              <span className="font-semibold text-green-600">
                                ${vendorResult.lowestPrice.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Parts Available: </span>
                            <span className="font-semibold">{vendorResult.partsAvailable}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

