import { redirect } from 'next/navigation'

export default function LegacyTimeApprovalsRedirect() {
  redirect('/dashboard/timekeeping/approvals')
}
