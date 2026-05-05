'use client'

import { useEffect } from 'react'

/** Number of recovery navigations per tab session (cache-busting URL). */
const STORAGE_KEY = 'portal-chunk-recovery-count'
const MAX_RECOVERIES = 2

function isChunkLoadFailure(message: string): boolean {
  return (
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch dynamically imported module')
  )
}

/**
 * After a deploy, browsers may briefly keep HTML that references removed chunks.
 * Uses a cache-busting navigation (not plain reload) so CDNs/browsers fetch a fresh shell.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('_chunk')) {
      url.searchParams.delete('_chunk')
      const qs = url.searchParams.toString()
      window.history.replaceState({}, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`)
    }
  }, [])

  useEffect(() => {
    const maybeRecover = (message: string) => {
      if (!isChunkLoadFailure(message)) return
      try {
        const n = Number(sessionStorage.getItem(STORAGE_KEY) || '0')
        if (n >= MAX_RECOVERIES) return
        sessionStorage.setItem(STORAGE_KEY, String(n + 1))
      } catch {
        return
      }
      const u = new URL(window.location.href)
      u.searchParams.set('_chunk', String(Date.now()))
      window.location.replace(u.toString())
    }

    const onError = (event: ErrorEvent) => {
      maybeRecover(event.message || '')
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const r = event.reason
      const msg = typeof r?.message === 'string' ? r.message : String(r ?? '')
      maybeRecover(msg)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
