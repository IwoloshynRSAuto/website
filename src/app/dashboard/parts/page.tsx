import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { PartsClient } from '@/components/parts/parts-client'

export default async function PartsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  return (
    <DashboardPageShell title="Parts" description="Search, create, and manage parts and vendor pricing used in BOMs.">
      <PartsClient />
    </DashboardPageShell>
  )
}

