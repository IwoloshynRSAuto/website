'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { Search, Eye, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import useSWR from 'swr'

interface Quote {
  id: string
  quoteNumber: string
  title: string
  customerName: string | null
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'CANCELLED' | 'WON' | 'LOST'
  amount: number
  updatedAt: string
  createdAt: string
}

interface QuotesAgileBoardProps {
  initialQuotes: Quote[]
}

const STATUS_COLUMNS: Array<{
  id: 'DRAFT' | 'SENT' | 'APPROVED' | 'CANCELLED'
  label: string
  color: string
}> = [
  { id: 'DRAFT', label: 'Draft', color: 'bg-gray-100 border-gray-300' },
  { id: 'SENT', label: 'Sent', color: 'bg-blue-100 border-blue-300' },
  { id: 'APPROVED', label: 'Approved', color: 'bg-green-100 border-green-300' },
  { id: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 border-red-300' },
]

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch quotes')
  const data = await res.json()
  return data.data || []
}

export function QuotesAgileBoard({ initialQuotes }: QuotesAgileBoardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState({
    DRAFT: true,
    SENT: true,
    APPROVED: true,
    CANCELLED: true,
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedQuote, setDraggedQuote] = useState<Quote | null>(null)

  // Use SWR for data fetching with revalidation
  const { data: quotes = initialQuotes, mutate } = useSWR<Quote[]>(
    '/api/quotes',
    fetcher,
    {
      fallbackData: initialQuotes,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter quotes by search query
  const filteredQuotes = useMemo(() => {
    if (!searchQuery.trim()) return quotes

    const query = searchQuery.toLowerCase()
    return quotes.filter(
      (quote) =>
        quote.quoteNumber.toLowerCase().includes(query) ||
        quote.title.toLowerCase().includes(query) ||
        (quote.customerName && quote.customerName.toLowerCase().includes(query))
    )
  }, [quotes, searchQuery])

  // Group quotes by status
  const quotesByStatus = useMemo(() => {
    const grouped: Record<string, Quote[]> = {
      DRAFT: [],
      SENT: [],
      APPROVED: [],
      CANCELLED: [],
    }

    filteredQuotes.forEach((quote) => {
      if (quote.status in grouped) {
        grouped[quote.status].push(quote)
      }
    })

    return grouped
  }, [filteredQuotes])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const quote = quotes.find((q) => q.id === active.id)
    setActiveId(active.id as string)
    setDraggedQuote(quote || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedQuote(null)

    if (!over) return

    const quoteId = active.id as string
    const newStatus = over.id as 'DRAFT' | 'SENT' | 'APPROVED' | 'CANCELLED'
    const quote = quotes.find((q) => q.id === quoteId)

    if (!quote || quote.status === newStatus) return

    // Optimistic update
    const optimisticQuotes = quotes.map((q) =>
      q.id === quoteId ? { ...q, status: newStatus } : q
    )
    mutate(optimisticQuotes, false)

    try {
      const response = await fetch(`/api/quotes/${quoteId}/agile-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        // Revert optimistic update
        mutate(quotes, false)

        if (data.requiresCancellationNote) {
          toast.error(
            'Quote requires cancellation note — open quote to cancel properly.'
          )
        } else {
          toast.error(data.error || 'Failed to update quote status')
        }
        return
      }

      toast.success(`Moved Quote ${quote.quoteNumber} to ${STATUS_COLUMNS.find(c => c.id === newStatus)?.label || newStatus}`)
      
      // Revalidate to get fresh data
      mutate()
    } catch (error: any) {
      // Revert optimistic update
      mutate(quotes, false)
      console.error('Error updating quote status:', error)
      toast.error('Failed to update quote status')
    }
  }

  const toggleColumn = (status: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [status]: !prev[status] }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Dev Warning Banner */}
      <div className="mb-6 rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <p className="text-sm font-medium text-yellow-800">
            ⚠️ DEV Board — For development/testing only. This interacts with the real database. Do not use for production workflows.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quote Board (DEV)
        </h1>
        <p className="text-gray-600">
          Drag and drop quotes between columns to update their status
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by quote number, title, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_COLUMNS.map((column) => (
            <button
              key={column.id}
              onClick={() => toggleColumn(column.id)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                visibleColumns[column.id]
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {column.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((column) => {
            if (!visibleColumns[column.id]) return null

            const columnQuotes = quotesByStatus[column.id] || []

            return (
              <StatusColumn
                key={column.id}
                id={column.id}
                label={column.label}
                color={column.color}
                quotes={columnQuotes}
                onViewQuote={(quoteId) => {
                  router.push(`/dashboard/parts/quotes/${quoteId}`)
                }}
              />
            )
          })}
        </div>

        <DragOverlay>
          {draggedQuote ? <QuoteCard quote={draggedQuote} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface StatusColumnProps {
  id: 'DRAFT' | 'SENT' | 'APPROVED' | 'CANCELLED'
  label: string
  color: string
  quotes: Quote[]
  onViewQuote: (quoteId: string) => void
}

function StatusColumn({ id, label, color, quotes, onViewQuote }: StatusColumnProps) {
  const quoteIds = quotes.map((q) => q.id)

  return (
    <div className="flex flex-col h-full">
      <div className={`${color} rounded-t-lg p-3 border-b-2`}>
        <h2 className="font-semibold text-gray-800">{label}</h2>
        <p className="text-sm text-gray-600 mt-1">{quotes.length} quotes</p>
      </div>
      <div className="flex-1 bg-white rounded-b-lg border-2 border-t-0 p-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto">
        <SortableContext items={quoteIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {quotes.map((quote) => (
              <SortableQuoteCard
                key={quote.id}
                quote={quote}
                onViewQuote={onViewQuote}
              />
            ))}
            {quotes.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">
                No quotes
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

interface SortableQuoteCardProps {
  quote: Quote
  onViewQuote: (quoteId: string) => void
}

function SortableQuoteCard({ quote, onViewQuote }: SortableQuoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quote.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <QuoteCard
        quote={quote}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onViewQuote={onViewQuote}
      />
    </div>
  )
}

interface QuoteCardProps {
  quote: Quote
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  onViewQuote: (quoteId: string) => void
}

function QuoteCard({
  quote,
  isDragging = false,
  dragHandleProps,
  onViewQuote,
}: QuoteCardProps) {
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    WON: 'bg-emerald-100 text-emerald-800',
    LOST: 'bg-orange-100 text-orange-800',
  }

  return (
    <Card
      className={`p-4 cursor-move hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg' : ''
      }`}
      {...dragHandleProps}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-gray-900">
              {quote.quoteNumber}
            </h3>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {quote.title}
            </p>
          </div>
        </div>

        {quote.customerName && (
          <div className="text-xs text-gray-500">
            Customer: {quote.customerName}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-green-600">
            ${quote.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <Badge
            className={`text-xs ${statusColors[quote.status] || 'bg-gray-100 text-gray-800'}`}
          >
            {quote.status}
          </Badge>
        </div>

        <div className="text-xs text-gray-400">
          Updated: {format(new Date(quote.updatedAt), 'MMM d, yyyy')}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full mt-2"
          onClick={(e) => {
            e.stopPropagation()
            onViewQuote(quote.id)
          }}
        >
          <Eye className="h-3 w-3 mr-1" />
          View Quote
        </Button>
      </div>
    </Card>
  )
}

