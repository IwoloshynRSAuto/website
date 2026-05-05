'use client'

function isLikelyChunkFailure(error: Error): boolean {
  const name = error?.name ?? ''
  const msg = error?.message ?? ''
  return (
    name === 'ChunkLoadError' ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk') ||
    msg.includes('failed to fetch dynamically imported module')
  )
}

/**
 * Inline styles only: when chunks fail, Tailwind may not have loaded yet.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const chunk = isLikelyChunkFailure(error)

  return (
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
          Something went wrong
        </h1>
        <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.55, marginBottom: 18 }}>
          {chunk ? (
            <>
              The browser could not load one of the app&apos;s script bundles (including{' '}
              <strong>HTTP 500 on <code style={{ fontSize: 13 }}>/_next/static/…/*.js</code></strong>
              ). That almost always means production is serving a <strong>mismatched or incomplete
              build</strong> (HTML from one deploy, <code style={{ fontSize: 13 }}>.next/static</code>{' '}
              from another), a proxy is misrouting static files, or a deploy was interrupted. Try a
              hard refresh (Ctrl+Shift+R). If it persists, redeploy on the host with{' '}
              <code style={{ fontSize: 13 }}>npm run deploy:prod:clean</code> so the entire{' '}
              <code style={{ fontSize: 13 }}>.next</code> folder matches the running Node process.
            </>
          ) : (
            <>An unexpected error occurred. You can try again or return to sign-in.</>
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
              try {
                sessionStorage.removeItem('portal-chunk-recovery-count')
              } catch {
                /* ignore */
              }
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
            Go to sign-in
          </button>
        </div>
        {chunk ? (
          <p style={{ marginTop: 18, fontSize: 12, color: '#9ca3af', lineHeight: 1.45 }}>
            Admin: open{' '}
            <a href="/api/build-health" style={{ color: '#2563eb', textDecoration: 'underline' }}>
              /api/build-health
            </a>{' '}
            — it must return <code style={{ fontSize: 12 }}>&quot;ok&quot;: true</code>. If{' '}
            <code style={{ fontSize: 12 }}>ok</code> is false or chunks 500 while it is true, fix the
            reverse-proxy so <code style={{ fontSize: 12 }}>/_next/static</code> is served by this
            Next app (not a stale upstream).
          </p>
        ) : null}
      </div>
    </div>
  )
}
