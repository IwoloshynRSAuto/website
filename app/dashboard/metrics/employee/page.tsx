import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { authorize } from '@/lib/auth/authorization'
import { EmployeeMetricsDashboard } from '@/components/metrics/employee-metrics-dashboard'

export default async function EmployeeMetricsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  if (!authorize(session.user, 'read', 'analytics')) {
    redirect('/dashboard')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employee Metrics</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">View employee productivity, hours, and accuracy metrics</p>
      </div>

      <EmployeeMetricsDashboard userId={session.user.id} />
    </div>
  )
}

