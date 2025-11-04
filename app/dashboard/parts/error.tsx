'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Parts Dashboard error:', error)
  }, [error])

  return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Parts Dashboard</h2>
        <p className="text-red-800 mb-4">{error.message || 'Unknown error occurred'}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

