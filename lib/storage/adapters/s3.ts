// These imports are only used when S3 storage is actually needed
// The file is dynamically imported, so these won't be bundled unless S3 is used
import type { StorageAdapter } from '../types'

// Lazy load AWS SDK to avoid bundling when not needed
let S3Client: any
let PutObjectCommand: any
let GetObjectCommand: any
let DeleteObjectCommand: any
let HeadObjectCommand: any
let getSignedUrl: any

async function loadAWSSDK() {
  if (!S3Client) {
    // Use string-based dynamic imports to prevent webpack from analyzing them
    const s3Module = await import(/* webpackIgnore: true */ '@aws-sdk/client-s3')
    const presignerModule = await import(/* webpackIgnore: true */ '@aws-sdk/s3-request-presigner')
    S3Client = s3Module.S3Client
    PutObjectCommand = s3Module.PutObjectCommand
    GetObjectCommand = s3Module.GetObjectCommand
    DeleteObjectCommand = s3Module.DeleteObjectCommand
    HeadObjectCommand = s3Module.HeadObjectCommand
    getSignedUrl = presignerModule.getSignedUrl
  }
}

export interface S3StorageConfig {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region?: string
  publicUrl?: string
}

export class S3StorageAdapter implements StorageAdapter {
  private client: any
  private bucket: string
  private publicUrl?: string
  private config: S3StorageConfig

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket
    this.publicUrl = config.publicUrl
    this.config = config
    // Client will be initialized lazily when first used
  }

  private async ensureClient() {
    if (!this.client) {
      await loadAWSSDK()
      this.client = new S3Client({
        endpoint: this.config.endpoint,
        region: this.config.region || 'us-east-1',
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
        // Force path style for DigitalOcean Spaces and MinIO
        forcePathStyle: true,
      })
    }
  }

  async upload(path: string, buffer: Buffer, contentType?: string): Promise<string> {
    await this.ensureClient()
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    })

    await this.client.send(command)
    return path
  }

  async download(path: string): Promise<Buffer> {
    await this.ensureClient()
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    })

    const response = await this.client.send(command)
    const chunks: Uint8Array[] = []

    if (response.Body) {
      for await (const chunk of response.Body as any) {
        chunks.push(chunk)
      }
    }

    return Buffer.concat(chunks)
  }

  async delete(path: string): Promise<void> {
    await this.ensureClient()
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    })

    await this.client.send(command)
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.ensureClient()
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      })
      await this.client.send(command)
      return true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    await this.ensureClient()
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  getPublicUrl(path: string): string | null {
    if (this.publicUrl) {
      // Remove trailing slash if present
      const baseUrl = this.publicUrl.replace(/\/$/, '')
      return `${baseUrl}/${path}`
    }
    return null
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Try to list objects (with limit 1) to check connectivity
      const testKey = '.health-check'
      const testBuffer = Buffer.from('test')
      await this.upload(testKey, testBuffer, 'text/plain')
      await this.delete(testKey)
      return { healthy: true, message: 'S3 storage is accessible and writable' }
    } catch (error: any) {
      return {
        healthy: false,
        message: `S3 storage health check failed: ${error.message}`,
      }
    }
  }
}

