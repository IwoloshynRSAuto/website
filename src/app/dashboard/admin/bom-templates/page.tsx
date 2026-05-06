import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { BomTemplatesAdminClient } from '@/components/admin/bom-templates-admin-client'

export const dynamic = 'force-dynamic'

export default async function BomTemplatesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'ADMIN') redirect('/dashboard/home')

  return (
    <DashboardPageShell
      title="BOM templates & reusable assemblies"
      description="Saved BOM templates are your reusable parts lists and assembly library — load them into quotes instead of rebuilding from scratch each time."
    >
      <BomTemplatesAdminClient />
    </DashboardPageShell>
  )
}

