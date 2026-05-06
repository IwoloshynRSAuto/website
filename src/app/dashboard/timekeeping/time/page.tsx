import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TimekeepingDevWorkspace } from '@/components/timekeeping/timekeeping-dev-workspace'

export default async function TimeTrackingPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <TimekeepingDevWorkspace
      pageTitle="Time (Job Time Tracking)"
      pageDescription="Track time to jobs or open quotes here, then submit the calendar week. Quote numbers book to the quote (a linked job record is created when needed so costing stays consistent)."
    />
  )
}
