import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { MachineShopPanel } from '@/app/dashboard/scheduling/machine-shop-panel'

export default async function AdminMachineShopPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'ADMIN') redirect('/dashboard/home')

  const now = new Date()
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  return (
    <DashboardPageShell title="Machine shop" description="Manage machine rows used by scheduling.">
      <MachineShopPanel
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        showBookings={false}
        showMachineManagement
        showTimeline={false}
        pixelsPerDay={18}
      />
    </DashboardPageShell>
  )
}

