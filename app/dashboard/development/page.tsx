import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DevelopmentPage() {
  // Redirect to tasks page since development and tasks are now merged
  redirect('/dashboard/tasks')
}



