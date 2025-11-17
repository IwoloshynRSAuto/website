import { redirect } from 'next/navigation'

export default async function AdminPage() {
  // Redirect old admin route to admin dashboard
  redirect('/dashboard/manager')
}


