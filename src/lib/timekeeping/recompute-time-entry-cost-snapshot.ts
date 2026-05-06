import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { computeTimeEntryCostsPlain } from '@/lib/timekeeping/time-entry-cost'
import { getOtMultiplier } from '@/lib/settings/system-settings'
import { isOtLaborCode, stripOtLaborCodeSuffix } from '@/lib/labor-codes/ot-code'

type Db = Pick<PrismaClient, 'systemSetting' | 'laborCode' | 'timeEntry'>

export async function recomputeTimeEntryCostSnapshot(
  db: Db,
  input: {
    timeEntryId: string
    regularHours: number
    overtimeHours: number
    laborCodeId: string | null
    explicitRate: number | null
  }
): Promise<void> {
  const globalOtMult = await getOtMultiplier(db)

  let baseRate = 0
  let otMultToUse = globalOtMult

  if (input.laborCodeId) {
    const lc = await db.laborCode.findUnique({
      where: { id: input.laborCodeId },
      select: { code: true, hourlyRate: true, isOvertimePhase: true, overtimeRateMultiplier: true },
    })
    const hr = lc?.hourlyRate != null ? Number(lc.hourlyRate) : NaN
    if (Number.isFinite(hr) && hr > 0) {
      const code = String(lc?.code || '')
      const otSuffix = isOtLaborCode(code)
      const usePhaseMult = Boolean(lc?.isOvertimePhase || otSuffix)
      if (usePhaseMult) {
        const pm = lc?.overtimeRateMultiplier != null ? Number(lc.overtimeRateMultiplier) : globalOtMult
        otMultToUse = Number.isFinite(pm) && pm > 0 ? pm : globalOtMult
      } else {
        otMultToUse = globalOtMult
      }

      if (otSuffix) {
        const stripped = stripOtLaborCodeSuffix(code)
        const baseLc = await db.laborCode.findFirst({
          where: { code: { equals: stripped, mode: 'insensitive' } },
          select: { hourlyRate: true },
        })
        const br = baseLc?.hourlyRate != null ? Number(baseLc.hourlyRate) : NaN
        baseRate = Number.isFinite(br) && br > 0 ? br : hr
      } else {
        baseRate = hr
      }
    }
  } else if (input.explicitRate != null && Number.isFinite(input.explicitRate)) {
    baseRate = Number(input.explicitRate)
  }

  const regH = Math.max(0, Number(input.regularHours) || 0)
  const otH = Math.max(0, Number(input.overtimeHours) || 0)
  const base = Math.max(0, Number(baseRate) || 0)
  const mult = Math.max(0, Number(otMultToUse) || 0)

  const { regularCost, otCost, totalCost } = computeTimeEntryCostsPlain({
    regularHours: regH,
    overtimeHours: otH,
    baseRate: base,
    otMultiplier: mult,
  })

  await db.timeEntry.update({
    where: { id: input.timeEntryId },
    data: {
      rate: new Prisma.Decimal(base),
      regularRateUsed: new Prisma.Decimal(base),
      otRateUsed: new Prisma.Decimal(base),
      otMultiplierUsed: new Prisma.Decimal(mult),
      regularCost: new Prisma.Decimal(regularCost),
      otCost: new Prisma.Decimal(otCost),
      totalCost: new Prisma.Decimal(totalCost),
    },
  })
}

