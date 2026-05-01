import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { getOtMultiplier } from '@/lib/settings/system-settings'

type DbWithLabor = Pick<PrismaClient, 'laborCode'>

export type TimeEntryCostSnapshot = {
  rate: Prisma.Decimal | null
  regularRateUsed: Prisma.Decimal
  otRateUsed: Prisma.Decimal
  otMultiplierUsed: Prisma.Decimal
  regularCost: Prisma.Decimal
  otCost: Prisma.Decimal
  totalCost: Prisma.Decimal
}

/** Pure calculation for tests and server reuse. */
export function computeTimeEntryCostsPlain(input: {
  regularHours: number
  overtimeHours: number
  baseRate: number
  otMultiplier: number
}): { regularCost: number; otCost: number; totalCost: number } {
  const regH = Math.max(0, Number(input.regularHours) || 0)
  const otH = Math.max(0, Number(input.overtimeHours) || 0)
  const base = Math.max(0, Number(input.baseRate) || 0)
  const mult = Math.max(0, Number(input.otMultiplier) || 0)
  const regularCost = base * regH
  const otCost = base * otH * mult
  return {
    regularCost,
    otCost,
    totalCost: regularCost + otCost,
  }
}

export async function resolveBaseHourlyRate(
  db: DbWithLabor,
  laborCodeId: string | null | undefined,
  explicitRate: number | null | undefined
): Promise<number> {
  if (laborCodeId) {
    const lc = await db.laborCode.findUnique({
      where: { id: laborCodeId },
      select: { hourlyRate: true },
    })
    const hr = lc?.hourlyRate != null ? Number(lc.hourlyRate) : NaN
    if (!Number.isFinite(hr) || hr <= 0) {
      throw new Error('Phase code hourly rate must be greater than zero')
    }
    return hr
  }
  const r = explicitRate
  if (r == null || !Number.isFinite(r) || r < 0) {
    throw new Error('Hourly rate is required when no phase code is selected')
  }
  return r
}

export async function buildTimeEntryCostSnapshot(
  db: DbWithLabor & Pick<PrismaClient, 'systemSetting'>,
  input: {
    regularHours: number
    overtimeHours: number
    laborCodeId: string | null | undefined
    explicitRate: number | null | undefined
  },
  otMultiplierOverride?: number
): Promise<TimeEntryCostSnapshot> {
  const mult =
    otMultiplierOverride != null && Number.isFinite(otMultiplierOverride) && otMultiplierOverride > 0
      ? otMultiplierOverride
      : await getOtMultiplier(db)

  const baseRate = await resolveBaseHourlyRate(db, input.laborCodeId ?? null, input.explicitRate)

  const { regularCost, otCost, totalCost } = computeTimeEntryCostsPlain({
    regularHours: input.regularHours,
    overtimeHours: input.overtimeHours,
    baseRate,
    otMultiplier: mult,
  })

  const baseDec = new Prisma.Decimal(baseRate)
  const multDec = new Prisma.Decimal(mult)

  return {
    rate: baseDec,
    regularRateUsed: baseDec,
    otRateUsed: baseDec,
    otMultiplierUsed: multDec,
    regularCost: new Prisma.Decimal(regularCost),
    otCost: new Prisma.Decimal(otCost),
    totalCost: new Prisma.Decimal(totalCost),
  }
}

export function formatTimeEntryDecimals<T extends Record<string, unknown>>(entry: T): T & Record<string, unknown> {
  const num = (v: unknown) => (v != null && v !== '' ? Number(v as Prisma.Decimal) : null)
  return {
    ...entry,
    rate: num((entry as { rate?: unknown }).rate),
    regularRateUsed: num((entry as { regularRateUsed?: unknown }).regularRateUsed),
    otRateUsed: num((entry as { otRateUsed?: unknown }).otRateUsed),
    otMultiplierUsed: num((entry as { otMultiplierUsed?: unknown }).otMultiplierUsed),
    regularCost: num((entry as { regularCost?: unknown }).regularCost),
    otCost: num((entry as { otCost?: unknown }).otCost),
    totalCost: num((entry as { totalCost?: unknown }).totalCost),
  }
}
