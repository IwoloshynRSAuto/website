'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Search, ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  primarySource: string | null
  purchasePrice: number | null
}

interface AddPartToPackageProps {
  packageId: string
  packageName: string
  availableParts: Part[]
}

export function AddPartToPackage({ packageId, packageName, availableParts }: AddPartToPackageProps) {
  const router = useRouter()
  const [partQuantities, setPartQuantities] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
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

  const handleAddParts = async () => {
    const partIds = Object.keys(partQuantities).filter(id => partQuantities[id] > 0)
    if (partIds.length === 0) {
      toast.error('Please select at least one part with quantity')
      return
    }

    setIsAdding(true)
    try {
      // Add parts with quantities
      for (const partId of partIds) {
        const quantity = Number(partQuantities[partId])
        if (!quantity || quantity <= 0) {
          toast.error(`Invalid quantity for part ${partId}`)
          continue
        }
        
        const response = await fetch(`/api/packages/${packageId}/parts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            partId, 
            quantity: quantity 
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          const errorMessage = error.error || error.message || 'Failed to add part'
          console.error('API Error:', error)
          throw new Error(errorMessage)
        }
      }

      const totalParts = Object.values(partQuantities).reduce((sum, qty) => sum + qty, 0)
      toast.success(`Added ${totalParts} part(s) to package`)
      router.push(`/dashboard/parts/packages/${packageId}`)
    } catch (error) {
      console.error('Error adding parts:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add parts'
      toast.error(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title={`Add Parts to ${packageName}`}
        subtitle="Select parts from the database to add to this package"
      >
        <Button variant="outline" onClick={() => router.push(`/dashboard/parts/packages/${packageId}`)}>
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
            Total quantity: {Object.values(partQuantities).reduce((sum, qty) => sum + qty, 0)}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
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
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/parts/packages/${packageId}`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddParts}
            disabled={isAdding || Object.keys(partQuantities).length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            {isAdding 
              ? 'Adding...' 
              : `Add ${Object.values(partQuantities).reduce((sum, qty) => sum + qty, 0)} Part(s)`
            }
          </Button>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

