'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface MarginTrackerProps {
  partSaleId: string
  initialMargin: number
  initialMarkup: number
}

export function MarginTracker({ partSaleId, initialMargin, initialMarkup }: MarginTrackerProps) {
  const [margin, setMargin] = useState(initialMargin)
  const [markup, setMarkup] = useState(initialMarkup)
  const [history, setHistory] = useState<Array<{ date: string; margin: number; markup: number }>>([])

  useEffect(() => {
    // Load margin/markup history from revisions if available
    // For now, just show current values
    setMargin(initialMargin)
    setMarkup(initialMarkup)
  }, [partSaleId, initialMargin, initialMarkup])

  const getMarginColor = (value: number) => {
    if (value >= 30) return 'text-green-600'
    if (value >= 20) return 'text-green-500'
    if (value >= 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getMarginBadge = (value: number) => {
    if (value >= 30) return 'default'
    if (value >= 20) return 'secondary'
    if (value >= 10) return 'outline'
    return 'destructive'
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Margin & Markup Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Margin</span>
                <Badge variant={getMarginBadge(margin)}>
                  {margin >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {margin.toFixed(1)}%
                </Badge>
              </div>
              <div className={`text-3xl font-bold ${getMarginColor(margin)}`}>
                {margin.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Margin = (Price - Cost) / Price × 100
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Markup</span>
                <Badge variant={getMarginBadge(markup)}>
                  {markup >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {markup.toFixed(1)}%
                </Badge>
              </div>
              <div className={`text-3xl font-bold ${getMarginColor(markup)}`}>
                {markup.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Markup = (Price - Cost) / Cost × 100
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3">Margin Guidelines</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span>Excellent: ≥30% margin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Good: 20-30% margin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                <span>Acceptable: 10-20% margin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span>Low: &lt;10% margin</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

