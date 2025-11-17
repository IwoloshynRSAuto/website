/**
 * Storage abstraction layer
 * Provides a unified interface for file storage operations
 * Supports local filesystem and S3-compatible storage
 */

import { StorageAdapter, StorageConfig } from './types'
import { LocalStorageAdapter } from './adapters/local'

let storageInstance: StorageAdapter | null = null

/**
 * Initialize storage adapter based on environment variables
 */
export async function initializeStorage(): Promise<StorageAdapter> {
  if (storageInstance) {
    return storageInstance
  }

  const adapter = (process.env.STORAGE_ADAPTER || 'local').toLowerCase() as 'local' | 's3'

  if (adapter === 's3') {
    const endpoint = process.env.S3_ENDPOINT
    const accessKeyId = process.env.S3_KEY
    const secretAccessKey = process.env.S3_SECRET
    const bucket = process.env.S3_BUCKET
    const region = process.env.S3_REGION
    const publicUrl = process.env.S3_PUBLIC_URL

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        'S3 storage requires S3_ENDPOINT, S3_KEY, S3_SECRET, and S3_BUCKET environment variables'
      )
    }

    // Lazy load S3 adapter to avoid bundling AWS SDK when not needed
    try {
      const { S3StorageAdapter } = await import('./adapters/s3')
      storageInstance = new S3StorageAdapter({
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucket,
        region,
        publicUrl,
      })
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
        throw new Error(
          'S3 storage adapter requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner packages. Please install them: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner'
        )
      }
      throw error
    }
  } else {
    // Default to local storage
    const basePath = process.env.STORAGE_BASE_PATH || process.cwd() + '/storage'
    storageInstance = new LocalStorageAdapter({ basePath })
  }

  return storageInstance
}

/**
 * Get the current storage adapter instance
 */
export async function getStorage(): Promise<StorageAdapter> {
  if (!storageInstance) {
    return await initializeStorage()
  }
  return storageInstance
}

/**
 * Reset storage instance (useful for testing)
 */
export function resetStorage(): void {
  storageInstance = null
}

// Export types and adapters for direct use if needed
export * from './types'
export { LocalStorageAdapter } from './adapters/local'
// S3StorageAdapter is exported via dynamic import to avoid bundling AWS SDK when not needed

