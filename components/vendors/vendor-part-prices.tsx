'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { Search, DollarSign, Clock, Package } from 'lucide-react'
import Link from 'next/link'

interface PartPrice {
  id: string
  partId: string
  partNumber: string
  manufacturer: string
  description: string | null
  price: number
  leadTimeDays: number | null
  minimumOrderQuantity: number | null
  effectiveDate: string
  notes: string | null
}

interface VendorPartPricesProps {
  vendorId: string
  initialPrices: PartPrice[]
}

export function VendorPartPrices({ vendorId, initialPrices }: VendorPartPricesProps) {
  const [prices, setPrices] = useState(initialPrices)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPrices = prices.filter(price => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      price.partNumber.toLowerCase().includes(search) ||
      price.manufacturer.toLowerCase().includes(search) ||
      (price.description?.toLowerCase().includes(search) || false)
    )
  })

  // Group by part to show price history
  const pricesByPart = filteredPrices.reduce((acc, price) => {
    const key = price.partId
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(price)
    return acc
  }, {} as Record<string, PartPrice[]>)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search parts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Part Prices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Lead Time</TableHead>
                  <TableHead className="text-center">Min Qty</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No part prices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrices.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/parts/database?partId=${price.partId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {price.partNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{price.manufacturer}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {price.description || <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${price.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {price.leadTimeDays ? (
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {price.leadTimeDays} days
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {price.minimumOrderQuantity ? (
                          <div className="flex items-center justify-center gap-1">
                            <Package className="h-4 w-4 text-gray-400" />
                            {price.minimumOrderQuantity}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(price.effectiveDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/parts/database?partId=${price.partId}`}>
                          <span className="text-blue-600 hover:underline text-sm">View Part</span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

