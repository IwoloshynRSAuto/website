/** Jobs board rows (`jobs` table) with quoted labor can use schedule segments when type is JOB or QUOTE. */
export function isSchedulableJobType(type: string | null | undefined): boolean {
  return type === 'JOB' || type === 'QUOTE'
}
