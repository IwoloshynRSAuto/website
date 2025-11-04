'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Download, X, Upload, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface QuoteFileViewerProps {
  quoteId: string
  quoteNumber: string
  quoteFile: string | null
  onFileUploaded: () => void
}

export function QuoteFileViewer({ quoteId, quoteNumber, quoteFile, onFileUploaded }: QuoteFileViewerProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileUrl = (filePath: string | null) => {
    if (!filePath) return null
    
    // Extract filename from path (storage/quotes/filename.ext)
    const filename = filePath.split('/').pop() || filePath.split('\\').pop() || filePath
    return `/api/quotes/files/${encodeURIComponent(filename)}`
  }

  const getFileType = (filePath: string | null) => {
    if (!filePath) return null
    const ext = filePath.split('.').pop()?.toLowerCase()
    return ext === 'pdf' ? 'pdf' : ext === 'doc' || ext === 'docx' ? 'word' : null
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      console.warn('No file selected')
      return
    }

    if (!quoteId) {
      console.error('No quote ID available!')
      toast.error('Quote ID is missing. Please refresh the page and try again.')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('=== UPLOAD START ===')
      console.log('File:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      })
      console.log('Quote ID:', quoteId)
      console.log('Upload URL:', `/api/quotes/${quoteId}/upload`)

      const response = await fetch(`/api/quotes/${quoteId}/upload`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log('Response text:', responseText)

      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError)
        responseData = { error: responseText || 'Invalid server response' }
      }

      if (response.ok) {
        console.log('Upload successful:', responseData)
        toast.success('File uploaded successfully')
        onFileUploaded()
      } else {
        console.error('Upload failed - Full error:', responseData)
        const errorMessage = responseData.error || responseData.details || responseData.message || 'Failed to upload file'
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('=== UPLOAD ERROR ===')
      console.error('Error type:', error?.constructor?.name)
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownload = () => {
    if (!quoteFile) return
    
    const fileUrl = getFileUrl(quoteFile)
    if (fileUrl) {
      // Trigger download
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = quoteFile.split('/').pop() || quoteFile.split('\\').pop() || 'quote-file'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleDeleteFile = async () => {
    if (!quoteFile || !quoteId) return

    if (!confirm('Are you sure you want to remove this quote file? You can upload a new one after deletion.')) {
      return
    }

    try {
      console.log('Deleting quote file for quote:', quoteId)
      
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteFile: null,
        }),
      })

      if (response.ok) {
        toast.success('Quote file removed successfully')
        onFileUploaded() // Refresh to show upload button
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Delete failed:', errorData)
        toast.error(errorData.error || 'Failed to remove quote file')
      }
    } catch (error) {
      console.error('Error deleting quote file:', error)
      toast.error(`Failed to remove quote file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const fileType = getFileType(quoteFile)
  const fileUrl = getFileUrl(quoteFile)

  return (
    <>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        {quoteFile ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsViewerOpen(true)
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300 transition-colors"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDeleteFile()
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
              title="Remove quote file"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDownload()
              }}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <label htmlFor={`quote-file-upload-${quoteId}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer"
                disabled={isUploading}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-1.5" />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </span>
              </Button>
            </label>
            <input
              id={`quote-file-upload-${quoteId}`}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              className="sr-only"
              disabled={isUploading}
              ref={fileInputRef}
            />
          </>
        )}
      </div>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Quote File: {quoteNumber}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            {fileType === 'pdf' && fileUrl ? (
              <iframe
                src={`${fileUrl}#toolbar=1&view=FitH&pagemode=none&zoom=page-width&viewrect=0,0,100,100&scrollbar=1&navpanes=1&spread=true`}
                className="w-full h-full min-h-[80vh] border border-gray-300 rounded"
                title="Quote PDF"
              />
            ) : fileType === 'word' ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
                <FileText className="h-16 w-16 text-gray-400" />
                <p className="text-gray-600">Word documents cannot be previewed in the browser.</p>
                <Button onClick={handleDownload} variant="default">
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <FileText className="h-16 w-16 text-gray-400" />
                <p className="text-gray-600 mt-4">File preview not available</p>
                <Button onClick={handleDownload} variant="default" className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => setIsViewerOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

