import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TaskBoard } from '@/components/dev/task-board'

export const dynamic = 'force-dynamic'

export default async function TaskBoardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Only allow admins and managers
  const userRole = session.user?.role
  if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
    redirect('/dashboard/home')
  }

  return <TaskBoard />
}
