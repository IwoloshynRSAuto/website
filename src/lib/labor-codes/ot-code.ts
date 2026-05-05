/** Overtime labor codes use this suffix (e.g. WC → WC/OT). */
export const OT_LABOR_CODE_SUFFIX = '/OT'

export function stripOtLaborCodeSuffix(code: string): string {
  return code.replace(/\/OT$/i, '').trim()
}

export function withOtLaborCodeSuffix(baseCode: string): string {
  const b = stripOtLaborCodeSuffix(baseCode).toUpperCase()
  return b.endsWith('/OT') ? b : `${b}${OT_LABOR_CODE_SUFFIX}`
}

export function isOtLaborCode(code: string | null | undefined): boolean {
  if (!code) return false
  return /\/OT$/i.test(code)
}
