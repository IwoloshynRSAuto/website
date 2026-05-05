/**
 * Billing-oriented punch duration: round elapsed wall time to the nearest minute
 * before converting to decimal hours. Avoids ISO timestamp millisecond drift where
 * e.g. 1h59m59s vs 2h00m skews OT cost (base × OT hours × multiplier).
 */
export function sanitizeBillableHours(h: unknown): number {
  const n = typeof h === 'number' ? h : Number(h)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 10000) / 10000
}

export function billableHoursFromPunchRange(punchInIso: string, punchOutIso: string | null): number {
  if (!punchOutIso) return 0
  const startMs = new Date(punchInIso).getTime()
  const endMs = new Date(punchOutIso).getTime()
  const ms = endMs - startMs
  if (!Number.isFinite(ms) || ms <= 0) return 0
  const minutes = Math.round(ms / 60000)
  return sanitizeBillableHours(minutes / 60)
}
