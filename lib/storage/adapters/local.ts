import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { StorageAdapter } from '../types'

export interface LocalStorageConfig {
  basePath: string
}

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string

  constructor(config: LocalStorageConfig) {
    this.basePath = config.basePath
  }

  async upload(path: string, buffer: Buffer, contentType?: string): Promise<string> {
    const fullPath = join(this.basePath, path)
    const dir = dirname(fullPath)

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })

    // Write file
    await fs.writeFile(fullPath, buffer)

    return path
  }

  async download(path: string): Promise<Buffer> {
    const fullPath = join(this.basePath, path)
    return await fs.readFile(fullPath)
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path)
    try {
      await fs.unlink(fullPath)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.basePath, path)
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    // For local storage, return a direct path that will be served via API
    // The API route will handle authentication/authorization
    return `/api/storage/files/${encodeURIComponent(path)}`
  }

  getPublicUrl(path: string): string | null {
    // Local storage doesn't have public URLs
    // Files are served through authenticated API routes
    return null
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Check if base directory exists and is writable
      await fs.access(this.basePath)
      const testPath = join(this.basePath, '.health-check')
      await fs.writeFile(testPath, Buffer.from('test'))
      await fs.unlink(testPath)
      return { healthy: true, message: 'Local storage is accessible and writable' }
    } catch (error: any) {
      return {
        healthy: false,
        message: `Local storage health check failed: ${error.message}`,
      }
    }
  }
}

