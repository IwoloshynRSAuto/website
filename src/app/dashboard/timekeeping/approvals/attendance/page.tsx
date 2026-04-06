import { redirect } from 'next/navigation'

export default function LegacyAttendanceApprovalsRedirect() {
  redirect('/dashboard/timekeeping/approvals')
}
