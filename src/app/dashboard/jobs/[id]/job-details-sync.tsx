'use client'

import { useState, useEffect } from 'react'
import { useLocalStorage } from '@/components/jobs/use-local-storage'

interface JobDetailsSyncProps {
  jobId: string
  children: (quickBooksState: boolean, lDriveState: boolean) => React.ReactNode
}

export function JobDetailsSync({ jobId, children }: JobDetailsSyncProps) {
  const [quickBooksState, setQuickBooksState, qbLoaded] = useLocalStorage<Record<string, boolean>>('quickBooksState', {})
  const [lDriveState, setLDriveState, lDriveLoaded] = useLocalStorage<Record<string, boolean>>('lDriveState', {})

  // Don't render until localStorage is loaded to prevent hydration mismatch
  if (!qbLoaded || !lDriveLoaded) {
    return <div>Loading...</div>
  }

  const currentQuickBooksState = quickBooksState[jobId] || false
  const currentLDriveState = lDriveState[jobId] || false

  return <>{children(currentQuickBooksState, currentLDriveState)}</>
}

