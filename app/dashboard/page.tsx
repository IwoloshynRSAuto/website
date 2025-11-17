import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Redirect old dashboard route to new home
  redirect('/dashboard/home')
}
