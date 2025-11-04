'use client'

// This component is deprecated - redirecting to new structure
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function PartsDashboard() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard/parts/database')
  }, [router])

  return null
}
