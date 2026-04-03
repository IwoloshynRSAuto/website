import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { JobsDevBoard } from '@/components/jobs/jobs-dev-board'

export const dynamic = 'force-dynamic'

export default async function JobsDevPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Jobs — Dev</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Experimental jobs list using the same layout style as Quotes. The standard Active Jobs page is unchanged.
        </p>
      </div>
      <JobsDevBoard />
    </div>
  )
}
