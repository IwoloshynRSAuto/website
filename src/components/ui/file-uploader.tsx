/**
 * FileUploader component - Standardized file upload UI
 */

'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, X, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

export interface FileUploaderProps {
  onUpload: (file: File) => Promise<void> | void
  accept?: string
  maxSize?: number // in bytes
  maxSizeMB?: number // in MB (convenience)
  multiple?: boolean
  disabled?: boolean
  className?: string
  label?: string
  description?: string
}

export function FileUploader({
  onUpload,
  accept,
  maxSize,
  maxSizeMB = 5,
  multiple = false,
  disabled = false,
  className,
  label = 'Upload File',
  description,
}: FileUploaderProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = React.useState(false)
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const effectiveMaxSize = maxSize || maxSizeMB * 1024 * 1024

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles: File[] = []

    for (const file of files) {
      // Check file size
      if (file.size > effectiveMaxSize) {
        toast({ title: `File "${file.name}" exceeds maximum size of ${maxSizeMB}MB`, variant: 'destructive' })
        continue
      }

      // Check file type if accept is specified
      if (accept && !accept.split(',').some((type) => file.type.match(type.trim()))) {
        toast({ title: `File "${file.name}" is not an accepted file type`, variant: 'destructive' })
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles))
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      await onUpload(file)
      setSelectedFiles((prev) => prev.filter((f) => f !== file))
      toast({ title: 'File uploaded successfully' })
    } catch (error: any) {
      toast({ title: 'Failed to upload file', description: error?.message, variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = (file: File) => {
    setSelectedFiles((prev) => prev.filter((f) => f !== file))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <label className="text-sm font-medium">{label}</label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
          id="file-upload-input"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Select File{multiple ? 's' : ''}
        </Button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpload(file)}
                  disabled={isUploading}
                >
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(file)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

