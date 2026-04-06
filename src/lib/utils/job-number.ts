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
