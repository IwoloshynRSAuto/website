'use client'

import { useState, useEffect } from 'react'
import { QuoteLaborEstimates } from './quote-labor-estimates'
import { Card, CardContent } from '@/components/ui/card'

interface QuoteLaborEstimatesSectionProps {
  quoteId: string
}

export function QuoteLaborEstimatesSection({ quoteId }: QuoteLaborEstimatesSectionProps) {
  const [laborCodes, setLaborCodes] = useState<Array<{
    id: string
    code: string
    name: string
    category: string
    hourlyRate: number
  }>>([])
  const [initialEstimates, setInitialEstimates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load labor codes
    fetch('/api/labor-codes')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setLaborCodes(data.data.map((lc: any) => ({
            id: lc.id,
            code: lc.code,
            name: lc.name || lc.description || '',
            category: lc.category || 'Other',
            hourlyRate: Number(lc.hourlyRate) || 0,
          })))
        }
      })
      .catch(err => console.error('Error loading labor codes:', err))

    // Load initial estimates
    fetch(`/api/quotes/${quoteId}/labor-estimates`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setInitialEstimates(data.data)
        }
      })
      .catch(err => {
        // API might not exist yet, that's okay
        console.warn('Could not load labor estimates:', err)
      })
      .finally(() => setIsLoading(false))
  }, [quoteId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading labor estimates...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <QuoteLaborEstimates
      quoteId={quoteId}
      initialEstimates={initialEstimates}
      laborCodes={laborCodes}
    />
  )
}

