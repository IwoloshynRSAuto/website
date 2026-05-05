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
      pageDescription="Track job time here, then submit the calendar week so hours appear on each job. Submit saves immediately to the job; approval controls locks and workflow."
    />
  )
}
