import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Hide empty or canned rejection copy so users only see meaningful feedback. */
export function shouldShowTimesheetRejectionReason(reason: string | null | undefined): boolean {
  if (!reason || !reason.trim()) return false
  const t = reason.trim().toLowerCase()
  if (t === 'rejected from weekly approvals') return false
  return true
}


