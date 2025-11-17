import { redirect } from 'next/navigation'

export default async function EmployeeDashboardPage() {
  // Redirect My Dashboard to Home since all functionality is now on Home
  redirect('/dashboard/home')
}
