/**
 * JobEntry stores whether the punch span counts entirely toward overtime (user checkbox).
 * Read strictly: never use Boolean(x) — Boolean("false") is true.
 * Accept boolean true or numeric 1 from some DB/driver combinations.
 */
export function jobEntryPunchIsOvertime(raw: unknown): boolean {
  if (raw === true) return true
  if (raw === 1) return true
  return false
}
