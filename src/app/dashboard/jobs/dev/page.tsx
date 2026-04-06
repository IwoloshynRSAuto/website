import { redirect } from 'next/navigation'

/** Old URL; jobs list now lives at `/dashboard/jobs`. */
export default function JobsDevRedirectPage() {
  redirect('/dashboard/jobs')
}
