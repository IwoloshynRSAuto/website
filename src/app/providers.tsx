'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster as ShadcnToaster } from '@/components/ui/toaster'
import { ChunkLoadRecovery } from '@/components/chunk-load-recovery'
import { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <ChunkLoadRecovery />
      {children}
      <ShadcnToaster />
    </SessionProvider>
  )
}


