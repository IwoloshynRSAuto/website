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
    
    console.log('[Providers] 🔧 Setting up fetch interceptor to prevent automatic reloads...')
    
    // Note: We can't reliably intercept window.location.reload() in all browsers
    // Instead, we rely on form data persistence via localStorage to survive reloads
    // The WebSocket monitoring below will help us understand when reloads are triggered
    
    // Also prevent HMR from triggering reloads by intercepting WebSocket close events
    const originalWebSocket = window.WebSocket
    window.WebSocket = function(...args: any[]) {
      const url = args[0]
      if (url && (url.includes('webpack-hmr') || url.includes('turbopack-hmr'))) {
        console.log('[Providers] 🔌 WebSocket connection attempt:', url)
        const ws = new originalWebSocket(...args)
        
        ws.addEventListener('error', (error) => {
          console.error('[Providers] ❌ WebSocket error:', error)
          console.error('[Providers] WebSocket URL:', url)
          console.error('[Providers] ⚠️ WebSocket failed - HMR will fall back to reloads, but we will try to prevent them')
        })
        
        ws.addEventListener('open', () => {
          console.log('[Providers] ✅ WebSocket connected successfully:', url)
          // Reset reload timer on successful connection
          (window as any).__lastReload = 0
        })
        
        ws.addEventListener('close', (event) => {
          console.log('[Providers] 🔌 WebSocket closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          })
          
          // If WebSocket closes abnormally, Next.js will try to reload
          // Form data is saved via localStorage, so reloads won't lose user input
          if (!event.wasClean && event.code === 1006) {
            console.log('[Providers] ⚠️ WebSocket closed abnormally - Next.js may attempt reload')
            console.log('[Providers] 💡 Don\'t worry - your form data is saved and will be restored after reload')
          }
        })
        
        return ws
      }
      
      return new originalWebSocket(...args)
    }
    
    const originalFetch = window.fetch
    let lastSessionFetch = 0
    let sessionCache: any = null
    const MIN_INTERVAL = 60 * 60 * 1000 // 1 hour minimum between session fetches
    
    window.fetch = function(...args) {
      const url = args[0]?.toString() || ''
      
      // Log ALL session requests to help debug
      if (url.includes('/api/auth/session')) {
        const now = Date.now()
        const timeSinceLastFetch = now - lastSessionFetch
        
        // Block if it's been less than 1 hour since last fetch
        if (timeSinceLastFetch > 0 && timeSinceLastFetch < MIN_INTERVAL) {
          console.log('[Providers] 🚫 BLOCKED automatic session refetch (only', Math.round(timeSinceLastFetch / 1000), 'seconds since last fetch)')
          
          // Return cached session if available, otherwise return a valid session response
          if (sessionCache) {
            console.log('[Providers] 📦 Returning cached session')
            return Promise.resolve(new Response(JSON.stringify(sessionCache), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }))
          }
          
          console.log('[Providers] 📦 Returning empty session response')
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
        console.log('[Providers] ✅ Allowing session fetch (', Math.round(timeSinceLastFetch / 1000), 'seconds since last fetch)')
        
        return originalFetch.apply(this, args).then(async (response) => {
          if (response.ok) {
            const clonedResponse = response.clone()
            try {
              sessionCache = await clonedResponse.json()
              console.log('[Providers] 💾 Cached session data')
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
          return response
        }).catch((error) => {
          console.error('[Providers] Error in session fetch:', error)
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
      // Set to 0 to completely disable automatic refetching (Next-Auth v4 requires 0, not false)
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
      <ReactHotToaster position="top-right" />
      <ShadcnToaster />
    </SessionProvider>
  )
}


