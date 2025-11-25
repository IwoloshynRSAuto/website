import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TaskBoard } from '@/components/tasks/task-board'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch all users for the employee filter (admins can see all, regular users only see themselves)
  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'MANAGER'
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  })

  return <TaskBoard userId={session.user.id} users={users} isAdmin={isAdmin} />
}

