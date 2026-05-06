import Link from 'next/link'

export default function Custom500() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 560, width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: '#111827' }}>Internal server error</h1>
        <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
          The portal hit an unexpected error. If this happens after a deploy, try a hard refresh (Ctrl+Shift+R).
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.location.reload()
            }}
            style={{
              padding: '10px 14px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Reload
          </a>
          <Link
            href="/dashboard/home"
            style={{
              padding: '10px 14px',
              background: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}

