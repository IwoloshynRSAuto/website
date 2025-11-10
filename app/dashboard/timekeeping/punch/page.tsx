import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PunchInOutTimesheet } from '@/components/timekeeping/punch-in-out-timesheet'

export default async function PunchInOutPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Timesheet Portal</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Clock in/out and track job time</p>
      </div>

      <PunchInOutTimesheet userId={session.user.id} userName={session.user.name || session.user.email} />
    </div>
  )
}
