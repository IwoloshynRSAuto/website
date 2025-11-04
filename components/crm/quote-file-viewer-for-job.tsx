'use client'

import { useState, useEffect } from 'react'
import { QuoteFileViewer } from './quote-file-viewer'
import { toast } from 'react-hot-toast'

interface QuoteFileViewerForJobProps {
  jobId: string
  jobNumber: string
  existingQuote: {
    id: string
    quoteNumber: string
    quoteFile: string | null
  } | null
}

export function QuoteFileViewerForJob({ jobId, jobNumber, existingQuote }: QuoteFileViewerForJobProps) {
  const [quote, setQuote] = useState<{
    id: string
    quoteNumber: string
    quoteFile: string | null
  } | null>(existingQuote)
  const [isLoading, setIsLoading] = useState(!existingQuote)

  useEffect(() => {
    // If we have an existing quote, use it
    if (existingQuote) {
      setQuote(existingQuote)
      setIsLoading(false)
      return
    }

    // Otherwise, get or create the quote
    const fetchOrCreateQuote = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/get-or-create-quote`)
        if (response.ok) {
          const data = await response.json()
          setQuote(data.quote)
        } else {
          const errorData = await response.json()
          console.error('Failed to get or create quote:', errorData.error)
          toast.error(errorData.error || 'Failed to initialize quote')
        }
      } catch (error) {
        console.error('Error fetching quote:', error)
        toast.error('Failed to load quote')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrCreateQuote()
  }, [jobId, existingQuote])

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 italic">
        Loading quote information...
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-sm text-gray-500 italic">
        Unable to create quote record. Please ensure the job has a customer assigned.
      </div>
    )
  }

  return (
    <QuoteFileViewer
      quoteId={quote.id}
      quoteNumber={quote.quoteNumber}
      quoteFile={quote.quoteFile}
      onFileUploaded={() => {
        // Refresh to show updated quote file
        window.location.reload()
      }}
    />
  )
}

