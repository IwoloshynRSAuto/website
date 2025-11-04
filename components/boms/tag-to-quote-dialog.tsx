'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'

interface Quote {
  id: string
  quoteNumber: string
  title: string
  status: string
}

interface TagToQuoteDialogProps {
  isOpen: boolean
  onClose: () => void
  onTag: (quoteId: string) => void
  currentBOMId: string
}

export function TagToQuoteDialog({ isOpen, onClose, onTag, currentBOMId }: TagToQuoteDialogProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchQuotes()
    }
  }, [isOpen])

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes')
      if (response.ok) {
        const data = await response.json()
        // Get all quotes, not just linked ones
        const allQuotesResponse = await fetch('/api/quotes/all')
        if (allQuotesResponse.ok) {
          const allQuotesData = await allQuotesResponse.json()
          setQuotes(allQuotesData.quotes || [])
        } else {
          setQuotes(data.quotes || [])
        }
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
      toast.error('Failed to load quotes')
    }
  }

  const handleTag = () => {
    if (!selectedQuoteId) {
      toast.error('Please select a quote')
      return
    }

    setIsLoading(true)
    onTag(selectedQuoteId)
    setIsLoading(false)
    setSelectedQuoteId('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag BOM to Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="quote-select">Select Quote</Label>
            <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
              <SelectTrigger id="quote-select" className="mt-1">
                <SelectValue placeholder="Choose a quote..." />
              </SelectTrigger>
              <SelectContent>
                {quotes.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>
                    {quote.quoteNumber} - {quote.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleTag} disabled={isLoading || !selectedQuoteId} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? 'Linking...' : 'Link BOM'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

