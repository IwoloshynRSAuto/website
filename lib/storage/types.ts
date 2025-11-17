/**
 * Storage adapter interface for file operations
 * Supports local filesystem and S3-compatible storage (DigitalOcean Spaces, AWS S3)
 */

export interface StorageAdapter {
  /**
   * Upload a file to storage
   * @param path - Storage path (e.g., 'quotes/quote-Q0001.pdf')
   * @param buffer - File buffer
   * @param contentType - MIME type (e.g., 'application/pdf')
   * @returns URL or path to the stored file
   */
  upload(path: string, buffer: Buffer, contentType?: string): Promise<string>

  /**
   * Download a file from storage
   * @param path - Storage path
   * @returns File buffer
   */
  download(path: string): Promise<Buffer>

  /**
   * Delete a file from storage
   * @param path - Storage path
   */
  delete(path: string): Promise<void>

  /**
   * Check if a file exists
   * @param path - Storage path
   * @returns true if file exists
   */
  exists(path: string): Promise<boolean>

  /**
   * Get a signed URL for temporary access (for S3) or direct URL (for local)
   * @param path - Storage path
   * @param expiresIn - Expiration time in seconds (default: 3600)
   * @returns Signed URL or direct URL
   */
  getSignedUrl(path: string, expiresIn?: number): Promise<string>

  /**
   * Get the public URL for a file (if applicable)
   * @param path - Storage path
   * @returns Public URL or null
   */
  getPublicUrl(path: string): string | null

  /**
   * Health check for the storage adapter
   * @returns Health status
   */
  healthCheck(): Promise<{ healthy: boolean; message?: string }>
}

export interface StorageConfig {
  adapter: 'local' | 's3'
  local?: {
    basePath: string
  }
  s3?: {
    endpoint: string
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    region?: string
    publicUrl?: string
  }
}

