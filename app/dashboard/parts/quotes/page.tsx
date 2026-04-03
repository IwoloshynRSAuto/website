import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function QuotesPage() {
  // Dedicated quotes workflow (same as Jobs → Quotes tab, but full page layout)
  redirect('/dashboard/quotes')
}

