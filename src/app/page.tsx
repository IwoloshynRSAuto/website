import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to home dashboard
  redirect('/dashboard/home')
}

