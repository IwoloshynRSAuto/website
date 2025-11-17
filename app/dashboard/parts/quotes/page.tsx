import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function QuotesPage() {
  // Redirect to Jobs page with quotes tab
  redirect('/dashboard/jobs?tab=quotes')
}

