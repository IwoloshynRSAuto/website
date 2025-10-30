import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect directly to dashboard, bypassing login
  redirect('/dashboard')
}

