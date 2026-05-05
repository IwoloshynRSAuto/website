'use client'

function isLikelyChunkFailure(error: Error): boolean {
  const name = error?.name ?? ''
  const msg = error?.message ?? ''
  return (
    name === 'ChunkLoadError' ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk')
  )
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const chunk = isLikelyChunkFailure(error)

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: '#f9fafb',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
            }}
          >
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
              Application error
            </h1>
            <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.55, marginBottom: 18 }}>
              {chunk ? (
                <>
                  Script bundles failed to load. Hard refresh (Ctrl+Shift+R). If this continues,
                  the production server needs a clean deploy so <code>.next/static</code> matches the
                  running app.
                </>
              ) : (
                <>The application hit a fatal error.</>
              )}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  if (chunk && typeof window !== 'undefined') {
                    try {
                      sessionStorage.removeItem('portal-chunk-recovery-count')
                    } catch {
                      /* ignore */
                    }
                    const u = new URL(window.location.href)
                    u.searchParams.set('_chunk', String(Date.now()))
                    window.location.replace(u.toString())
                    return
                  }
                  reset()
                }}
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `${window.location.origin}/auth/signin?recover=${Date.now()}`
                }}
                style={{
                  padding: '10px 18px',
                  background: '#fff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Sign-in
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
