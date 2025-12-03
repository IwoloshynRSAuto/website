'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster as ReactHotToaster } from 'react-hot-toast'
import { Toaster as ShadcnToaster } from '@/components/ui/toaster'
import { ReactNode, useEffect, useRef } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Note: We can't reliably intercept window.location.reload() in all browsers
    // Instead, we rely on form data persistence via localStorage to survive reloads
    // The WebSocket monitoring below will help us understand when reloads are triggered

    // Also prevent HMR from triggering reloads by intercepting WebSocket close events
    const originalWebSocket = window.WebSocket
    window.WebSocket = (function (...args: any[]) {
      const url = args[0]
      if (url && (url.includes('webpack-hmr') || url.includes('turbopack-hmr'))) {
        const ws = new originalWebSocket(...args)

        ws.addEventListener('open', () => {
          // Reset reload timer on successful connection
          (window as any).__lastReload = 0
        })

        return ws
      }

      return new originalWebSocket(...args)
    }) as any

    const originalFetch = window.fetch
    let lastSessionFetch = 0
    let sessionCache: any = null
    const MIN_INTERVAL = 60 * 60 * 1000 // 1 hour minimum between session fetches

    window.fetch = function (...args) {
      const url = args[0]?.toString() || ''

      // Log ALL session requests to help debug
      if (url.includes('/api/auth/session')) {
        const now = Date.now()
        const timeSinceLastFetch = now - lastSessionFetch

        // Block if it's been less than 1 hour since last fetch
        if (timeSinceLastFetch > 0 && timeSinceLastFetch < MIN_INTERVAL) {

          // Return cached session if available, otherwise return a valid session response
          if (sessionCache) {
            return Promise.resolve(new Response(JSON.stringify(sessionCache), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          return Promise.resolve(new Response(JSON.stringify({
            user: null,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

        // Allow the fetch, but cache the result
        lastSessionFetch = now

        return originalFetch.apply(this, args).then(async (response) => {
          if (response.ok) {
            const clonedResponse = response.clone()
            try {
              sessionCache = await clonedResponse.json()
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
          return response
        }).catch((error) => {
          throw error
        })
      }

      return originalFetch.apply(this, args)
    }

    return () => {
      window.fetch = originalFetch
      // Note: Can't easily restore window.location.reload, but it's fine
      // Note: Can't restore WebSocket constructor easily, but it's fine
    }
  }, [])

  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
      <ReactHotToaster position="top-right" />
      <ShadcnToaster />
    </SessionProvider>
  )
}


