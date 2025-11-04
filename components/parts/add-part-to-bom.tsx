'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ArrowLeft, Plus, Package, Box } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'react-hot-toast'

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  primarySource: string | null
  purchasePrice: number | null
  relatedParts: Array<{
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
  }>
}

interface Package {
  id: string
  name: string
  type: string
  description: string | null
  parts: Array<{
    partId: string
    partNumber: string
    manufacturer: string
    description: string | null
    source: string | null
    purchasePrice: number
    quantity: number
  }>
}

interface AddPartToBOMProps {
  bomId: string
  bomName: string
  availableParts: Part[]
  availablePackages?: Package[]
}

export function AddPartToBOM({ bomId, bomName, availableParts, availablePackages = [] }: AddPartToBOMProps) {
  const router = useRouter()
  const [partQuantities, setPartQuantities] = useState<Record<string, number>>({})
  const [packageQuantities, setPackageQuantities] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'parts' | 'packages'>('parts')
  const [isAdding, setIsAdding] = useState(false)

  const filteredParts = availableParts.filter(part => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      part.partNumber.toLowerCase().includes(search) ||
      part.manufacturer.toLowerCase().includes(search) ||
      (part.description?.toLowerCase().includes(search) ?? false)
    )
  })

  const filteredPackages = availablePackages.filter(pkg => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      pkg.name.toLowerCase().includes(search) ||
      (pkg.description?.toLowerCase().includes(search) ?? false) ||
      pkg.type.toLowerCase().includes(search)
    )
  })

  const handlePackageQuantityChange = (packageId: string, quantity: number) => {
    if (quantity <= 0) {
      const newQuantities = { ...packageQuantities }
      delete newQuantities[packageId]
      setPackageQuantities(newQuantities)
    } else {
      setPackageQuantities({
        ...packageQuantities,
        [packageId]: quantity
      })
    }
  }

  const handleQuantityChange = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      const newQuantities = { ...partQuantities }
      delete newQuantities[partId]
      setPartQuantities(newQuantities)
    } else {
      setPartQuantities({
        ...partQuantities,
        [partId]: quantity
      })
    }
  }

  const handleAddQuickRelated = (relatedPartId: string) => {
    if (!partQuantities[relatedPartId]) {
      setPartQuantities({
        ...partQuantities,
        [relatedPartId]: 1
      })
    }
  }

  const handleAddParts = async () => {
    const partIds = Object.keys(partQuantities).filter(id => partQuantities[id] > 0)
    const packageIds = Object.keys(packageQuantities).filter(id => packageQuantities[id] > 0)
    
    if (partIds.length === 0 && packageIds.length === 0) {
      toast.error('Please select at least one part or package with quantity')
      return
    }

    setIsAdding(true)
    try {
      const partsToAdd: Array<{
        partId: string
        partNumber: string
        manufacturer: string
        description: string | null
        source: string | null
        purchasePrice: number
        quantity: number
      }> = []

      // Add individual parts
      partIds.forEach(partId => {
        const part = availableParts.find(p => p.id === partId)!
        partsToAdd.push({
          partId: part.id,
          partNumber: part.partNumber,
          manufacturer: part.manufacturer,
          description: part.description,
          source: part.primarySource,
          purchasePrice: part.purchasePrice || 0,
          quantity: partQuantities[partId],
        })
      })

      // Expand packages/assemblies into individual parts
      packageIds.forEach(packageId => {
        const pkg = availablePackages.find(p => p.id === packageId)!
        const packageQty = packageQuantities[packageId]
        
        pkg.parts.forEach(pkgPart => {
          // Add each part from the package with package quantity multiplied
          partsToAdd.push({
            partId: pkgPart.partId,
            partNumber: pkgPart.partNumber,
            manufacturer: pkgPart.manufacturer,
            description: pkgPart.description,
            source: pkgPart.source,
            purchasePrice: pkgPart.purchasePrice,
            quantity: pkgPart.quantity * packageQty, // Multiply package quantity by part quantity
          })
        })
      })

      // Add parts one by one
      for (const partData of partsToAdd) {
        const response = await fetch(`/api/boms/${bomId}/parts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...partData,
            markupPercent: 20,
          }),
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to add part')
        }
      }

      const totalParts = partsToAdd.reduce((sum, p) => sum + p.quantity, 0)
      const itemType = packageIds.length > 0 ? 'item(s)' : 'part(s)'
      toast.success(`Added ${totalParts} ${itemType} to BOM`)
      router.push(`/dashboard/parts/boms/${bomId}`)
    } catch (error) {
      console.error('Error adding parts:', error)
      toast.error('Failed to add parts')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title={`Add Parts to ${bomName}`}
        subtitle="Select parts from the database to add to this BOM"
      >
        <Button variant="outline" onClick={() => router.push(`/dashboard/parts/assemblies/${bomId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </DashboardHeader>

      <DashboardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {Object.keys(partQuantities).length} part{Object.keys(partQuantities).length !== 1 ? 's' : ''} selected • 
            {Object.keys(packageQuantities).length > 0 && `${Object.keys(packageQuantities).length} package${Object.keys(packageQuantities).length !== 1 ? 's' : ''} selected • `}
            Total quantity: {Object.values(partQuantities).reduce((sum, qty) => sum + qty, 0) + 
              Object.entries(packageQuantities).reduce((sum, [pkgId, qty]) => {
                const pkg = availablePackages.find(p => p.id === pkgId)
                if (!pkg) return sum
                return sum + (pkg.parts.reduce((pSum, p) => pSum + p.quantity, 0) * qty)
              }, 0)}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'parts' | 'packages')} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="parts" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Parts ({filteredParts.length})
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  Packages/Assemblies ({filteredPackages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="parts" className="m-0">
                <div className="overflow-y-auto max-h-[calc(100vh-350px)]">
                  <div className="divide-y">
                    {filteredParts.map((part) => (
                  <div key={part.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{part.partNumber}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {part.manufacturer} • {part.description || 'No description'}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {part.purchasePrice !== null && (
                            <span className="text-xs text-gray-600">
                              ${part.purchasePrice.toFixed(2)}
                            </span>
                          )}
                          {part.primarySource && (
                            <span className="text-xs text-gray-500">
                              • Source: {part.primarySource}
                            </span>
                          )}
                        </div>

                        {/* Related Parts Quick Add */}
                        {part.relatedParts.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {part.relatedParts.map((relatedPart) => (
                              <Button
                                key={relatedPart.id}
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => handleAddQuickRelated(relatedPart.id)}
                                disabled={!!partQuantities[relatedPart.id]}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {relatedPart.partNumber}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`qty-${part.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                          Qty:
                        </Label>
                        <Input
                          id={`qty-${part.id}`}
                          type="number"
                          min="0"
                          value={partQuantities[part.id] || ''}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 0
                            handleQuantityChange(part.id, qty)
                          }}
                          className="w-20 h-8 text-center"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="packages" className="m-0">
                <div className="overflow-y-auto max-h-[calc(100vh-350px)]">
                  <div className="divide-y">
                    {filteredPackages.map((pkg) => (
                      <div key={pkg.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {pkg.type === 'Assembly' ? (
                                <Box className="h-4 w-4 text-purple-600" />
                              ) : (
                                <Package className="h-4 w-4 text-blue-600" />
                              )}
                              <div className="font-medium text-sm">{pkg.name}</div>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                pkg.type === 'Assembly' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {pkg.type}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {pkg.description || 'No description'}
                            </div>
                            <div className="text-xs text-gray-600 mt-2">
                              Contains {pkg.parts.length} part{pkg.parts.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`pkg-qty-${pkg.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                              Qty:
                            </Label>
                            <Input
                              id={`pkg-qty-${pkg.id}`}
                              type="number"
                              min="0"
                              value={packageQuantities[pkg.id] || ''}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 0
                                handlePackageQuantityChange(pkg.id, qty)
                              }}
                              className="w-20 h-8 text-center"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/parts/boms/${bomId}`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddParts}
            disabled={isAdding || (Object.keys(partQuantities).length === 0 && Object.keys(packageQuantities).length === 0)}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            {isAdding 
              ? 'Adding...' 
              : `Add ${Object.values(partQuantities).reduce((sum, qty) => sum + qty, 0) + 
                  Object.entries(packageQuantities).reduce((sum, [pkgId, qty]) => {
                    const pkg = availablePackages.find(p => p.id === pkgId)
                    if (!pkg) return sum
                    return sum + (pkg.parts.reduce((pSum, p) => pSum + p.quantity, 0) * qty)
                  }, 0)} Item(s)`
            }
          </Button>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

