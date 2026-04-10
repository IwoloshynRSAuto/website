/**
 * Project/job numbers in this app use an E prefix (e.g. E3970).
 * If a value from CSV or manual entry has no E, prepend it.
 */
export function normalizeProjectJobNumber(raw: string | null | undefined): string {
  if (raw == null) return ''
  let s = String(raw).trim().replace(/^#+/u, '')
  if (!s) return ''
  if (/^E/i.test(s)) return `E${s.replace(/^E/i, '').replace(/^#+/u, '')}`
  return `E${s}`
}

/** Quote rows on the jobs board use a Q prefix (e.g. Q2044). */
export function normalizeQuoteRecordNumber(raw: string | null | undefined): string {
  if (raw == null) return ''
  let s = String(raw).trim().replace(/^#+/u, '')
  if (!s) return ''
  if (/^Q/i.test(s)) return `Q${s.replace(/^Q/i, '').replace(/^#+/u, '')}`
  return `Q${s}`
}
