import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmployeeSelfService } from '@/components/employee/employee-self-service'
import { Suspense } from 'react'

function EmployeeRequestsContent({ userId, initialTab }: { userId: string; initialTab?: string }) {
  return <EmployeeSelfService userId={userId} initialTab={initialTab} />
}

export default async function EmployeeRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const params = await searchParams
  const initialTab = params.type === 'pto' ? 'pto' : params.type === 'expense' ? 'expense' : 'pto'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Requests</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Submit and track your time off, expenses, and time change requests</p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <EmployeeRequestsContent userId={session.user.id} initialTab={initialTab} />
      </Suspense>
    </div>
  )
}

