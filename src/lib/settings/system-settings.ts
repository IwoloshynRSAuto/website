import type { PrismaClient } from '@prisma/client'

export const OT_MULTIPLIER_SETTING_KEY = 'OT_MULTIPLIER'
export const DEFAULT_OT_MULTIPLIER = 1.5

/** Narrow DB surface used by settings helpers (works with prisma or tx client). */
type DbWithSettings = Pick<PrismaClient, 'systemSetting'>

export async function getDecimalSetting(
  db: DbWithSettings,
  key: string,
  fallback: number
): Promise<number> {
  const row = await db.systemSetting.findUnique({ where: { key } })
  const n = row?.decimalValue != null ? Number(row.decimalValue) : fallback
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export async function getOtMultiplier(db: DbWithSettings): Promise<number> {
  return getDecimalSetting(db, OT_MULTIPLIER_SETTING_KEY, DEFAULT_OT_MULTIPLIER)
}

export async function setDecimalSetting(
  db: DbWithSettings,
  key: string,
  value: number
): Promise<void> {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Setting value must be a finite positive number')
  }
  await db.systemSetting.upsert({
    where: { key },
    create: { key, decimalValue: value },
    update: { decimalValue: value },
  })
}
