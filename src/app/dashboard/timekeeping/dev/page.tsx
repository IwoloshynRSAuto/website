import { redirect } from 'next/navigation'

/** Legacy URL; primary time entry lives at `/dashboard/timekeeping/time`. */
export default function TimekeepingDevRedirectPage() {
  redirect('/dashboard/timekeeping/time')
}
