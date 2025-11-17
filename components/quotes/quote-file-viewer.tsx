/**
 * Updated Quote File Viewer using FileRecord
 * Supports multiple files per quote
 */

'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Download, X, Upload, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUploadQuoteFile } from '@/lib/quotes/useQuotes'
import { format } from 'date-fns'

interface FileRecord {
  id: string
  fileName: string
  fileType: string
  fileSize: number | null
  storagePath: string
  fileUrl: string | null
  createdAt: string
}

interface QuoteFileViewerProps {
  quoteId: string
  quoteNumber: string
  fileRecords?: FileRecord[]
  onFileUploaded: () => void
}

export function QuoteFileViewer({
  quoteId,
  quoteNumber,
  fileRecords = [],
  onFileUploaded,
}: QuoteFileViewerProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile, loading: isUploading } = useUploadQuoteFile()

  // Get the most recent file (for backward compatibility)
  const latestFile = fileRecords.length > 0 ? fileRecords[0] : null

  const getFileUrl = (fileRecord: FileRecord | null) => {
    if (!fileRecord) return null
    // Use storage API endpoint
    return `/api/storage/files/${encodeURIComponent(fileRecord.storagePath)}`
  }

  const getFileType = (fileRecord: FileRecord | null) => {
    if (!fileRecord) return null
    const ext = fileRecord.fileName.split('.').pop()?.toLowerCase()
    return ext === 'pdf' ? 'pdf' : ext === 'doc' || ext === 'docx' ? 'word' : null
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    if (!quoteId) {
      toast.error('Quote ID is missing. Please refresh the page and try again.')
      return
    }

    try {
      await uploadFile(quoteId, file)
      onFileUploaded()
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      // Error already handled by hook
    }
  }

  const handleDownload = (fileRecord: FileRecord) => {
    const fileUrl = getFileUrl(fileRecord)
    if (fileUrl) {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = fileRecord.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleDeleteFile = async (fileRecordId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      const response = await fetch(`/api/quotes/${quoteId}/files/${fileRecordId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('File deleted successfully')
        onFileUploaded()
        if (selectedFile?.id === fileRecordId) {
          setSelectedFile(null)
          setIsViewerOpen(false)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        toast.error(errorData.error || 'Failed to delete file')
      }
    } catch (error) {
      toast.error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleViewFile = (fileRecord: FileRecord) => {
    setSelectedFile(fileRecord)
    setIsViewerOpen(true)
  }

  const fileType = getFileType(selectedFile || latestFile)
  const fileUrl = getFileUrl(selectedFile || latestFile)

  return (
    <>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        {latestFile ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleViewFile(latestFile)
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300 transition-colors"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              View {fileRecords.length > 1 && `(${fileRecords.length})`}
            </Button>
            {fileRecords.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Show file list dialog
                  handleViewFile(latestFile)
                }}
                className="text-gray-600 hover:text-gray-900"
                title="View all files"
              >
                Files
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDownload(latestFile)
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
            <DialogTitle>
              Quote Files: {quoteNumber}
              {fileRecords.length > 1 && ` (${fileRecords.length} files)`}
            </DialogTitle>
          </DialogHeader>

          {fileRecords.length > 1 && (
            <div className="border-b p-4">
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {fileRecords.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                      selectedFile?.id === file.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{file.fileName}</div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize)} • {format(new Date(file.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(file)
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFile(file.id)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            {selectedFile || latestFile ? (
              <>
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
                    <Button onClick={() => handleDownload(selectedFile || latestFile!)} variant="default">
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                    <FileText className="h-16 w-16 text-gray-400" />
                    <p className="text-gray-600 mt-4">File preview not available</p>
                    <Button
                      onClick={() => handleDownload(selectedFile || latestFile!)}
                      variant="default"
                      className="mt-4"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <FileText className="h-16 w-16 text-gray-400" />
                <p className="text-gray-600 mt-4">No files available</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-500">
              {selectedFile || latestFile ? (
                <>
                  {formatFileSize((selectedFile || latestFile)!.fileSize)} •{' '}
                  {format(new Date((selectedFile || latestFile)!.createdAt), 'MMM d, yyyy')}
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {selectedFile || latestFile ? (
                <>
                  <Button variant="outline" onClick={() => handleDownload(selectedFile || latestFile!)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteFile((selectedFile || latestFile)!.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              ) : null}
              <Button variant="outline" onClick={() => setIsViewerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

