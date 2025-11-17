/**
 * Tests for LocalStorageAdapter
 */

import { LocalStorageAdapter } from '../adapters/local'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter
  let testDir: string

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = join(tmpdir(), `storage-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })
    adapter = new LocalStorageAdapter({ basePath: testDir })
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('upload', () => {
    it('should upload a file to storage', async () => {
      const path = 'test/file.txt'
      const buffer = Buffer.from('test content')
      const result = await adapter.upload(path, buffer, 'text/plain')

      expect(result).toBe(path)

      // Verify file exists
      const fullPath = join(testDir, path)
      const content = await fs.readFile(fullPath, 'utf-8')
      expect(content).toBe('test content')
    })

    it('should create nested directories', async () => {
      const path = 'nested/deep/path/file.txt'
      const buffer = Buffer.from('test')
      await adapter.upload(path, buffer)

      const exists = await adapter.exists(path)
      expect(exists).toBe(true)
    })
  })

  describe('download', () => {
    it('should download a file from storage', async () => {
      const path = 'test/download.txt'
      const content = 'download content'
      await adapter.upload(path, Buffer.from(content))

      const buffer = await adapter.download(path)
      expect(buffer.toString()).toBe(content)
    })

    it('should throw error for non-existent file', async () => {
      await expect(adapter.download('nonexistent.txt')).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should delete a file from storage', async () => {
      const path = 'test/delete.txt'
      await adapter.upload(path, Buffer.from('test'))

      await adapter.delete(path)

      const exists = await adapter.exists(path)
      expect(exists).toBe(false)
    })

    it('should not throw error for non-existent file', async () => {
      await expect(adapter.delete('nonexistent.txt')).resolves.not.toThrow()
    })
  })

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const path = 'test/exists.txt'
      await adapter.upload(path, Buffer.from('test'))

      const exists = await adapter.exists(path)
      expect(exists).toBe(true)
    })

    it('should return false for non-existent file', async () => {
      const exists = await adapter.exists('nonexistent.txt')
      expect(exists).toBe(false)
    })
  })

  describe('getSignedUrl', () => {
    it('should return API route path', async () => {
      const path = 'test/file.txt'
      const url = await adapter.getSignedUrl(path)

      expect(url).toContain('/api/storage/files/')
      expect(url).toContain(encodeURIComponent(path))
    })
  })

  describe('getPublicUrl', () => {
    it('should return null for local storage', () => {
      const url = adapter.getPublicUrl('test/file.txt')
      expect(url).toBeNull()
    })
  })

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await adapter.healthCheck()
      expect(health.healthy).toBe(true)
      expect(health.message).toContain('Local storage')
    })

    it('should detect unhealthy status for invalid path', async () => {
      const invalidAdapter = new LocalStorageAdapter({
        basePath: '/invalid/path/that/does/not/exist',
      })

      const health = await invalidAdapter.healthCheck()
      expect(health.healthy).toBe(false)
    })
  })
})

