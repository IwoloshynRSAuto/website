import { redirect } from 'next/navigation'

/** Canonical Insights entry: sidebar links target metrics/tables children directly. */
export default function InsightsIndexPage() {
  redirect('/dashboard/insights/metrics')
}
