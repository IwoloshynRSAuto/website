import { redirect } from 'next/navigation'

/** Avoid long-lived CDN/cache of the redirect shell (reduces ChunkLoadError after deploy). */
export const dynamic = 'force-dynamic'

export default function HomePage() {
  // Redirect to home dashboard
  redirect('/dashboard/home')
}

