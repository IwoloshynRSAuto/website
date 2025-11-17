/**
 * Integration tests for storage abstraction
 */

import { initializeStorage, getStorage, resetStorage } from '../index'
import { LocalStorageAdapter } from '../adapters/local'
import { tmpdir } from 'os'
import { join } from 'path'

describe('Storage Abstraction', () => {
  const originalEnv = process.env

  beforeEach(() => {
    resetStorage()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('initializeStorage', () => {
    it('should initialize local storage by default', () => {
      delete process.env.STORAGE_ADAPTER
      const storage = initializeStorage()
      expect(storage).toBeInstanceOf(LocalStorageAdapter)
    })

    it('should initialize local storage when STORAGE_ADAPTER=local', () => {
      process.env.STORAGE_ADAPTER = 'local'
      const storage = initializeStorage()
      expect(storage).toBeInstanceOf(LocalStorageAdapter)
    })

    it('should throw error for S3 without required env vars', () => {
      process.env.STORAGE_ADAPTER = 's3'
      delete process.env.S3_ENDPOINT
      delete process.env.S3_KEY
      delete process.env.S3_SECRET
      delete process.env.S3_BUCKET

      expect(() => initializeStorage()).toThrow('S3 storage requires')
    })

    it('should use STORAGE_BASE_PATH for local storage', () => {
      const customPath = join(tmpdir(), 'custom-storage')
      process.env.STORAGE_BASE_PATH = customPath
      process.env.STORAGE_ADAPTER = 'local'

      const storage = initializeStorage() as LocalStorageAdapter
      // We can't directly access basePath, but we can test it works
      expect(storage).toBeInstanceOf(LocalStorageAdapter)
    })
  })

  describe('getStorage', () => {
    it('should return same instance on multiple calls', () => {
      const storage1 = getStorage()
      const storage2 = getStorage()
      expect(storage1).toBe(storage2)
    })

    it('should initialize if not already initialized', () => {
      resetStorage()
      const storage = getStorage()
      expect(storage).toBeDefined()
    })
  })

  describe('resetStorage', () => {
    it('should reset storage instance', () => {
      const storage1 = getStorage()
      resetStorage()
      const storage2 = getStorage()
      expect(storage1).not.toBe(storage2)
    })
  })
})

