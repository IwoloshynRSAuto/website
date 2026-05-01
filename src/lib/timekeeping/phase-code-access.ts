import { prisma } from '@/lib/prisma'

export type AllowedPhaseCode = {
  id: string
  code: string
  name: string
}

export type PhaseCodeAccessSnapshot = {
  role: { id: string; name: string } | null
  roleDefaults: AllowedPhaseCode[]
  overrides: Array<{ laborCodeId: string; code: string; name: string; mode: 'ALLOW' | 'DENY' }>
  effective: AllowedPhaseCode[]
}

export async function getAllowedPhaseCodesForUser(userId: string): Promise<AllowedPhaseCode[]> {
  const snap = await getPhaseCodeAccessSnapshotForUser(userId)
  return snap.effective
}

export async function getAllowedPhaseCodeSetForUser(userId: string): Promise<Set<string>> {
  const allowed = await getAllowedPhaseCodesForUser(userId)
  return new Set(allowed.map((c) => c.code))
}

export async function getPhaseCodeAccessSnapshotForUser(userId: string): Promise<PhaseCodeAccessSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, jobRoleId: true, jobRole: { select: { id: true, name: true } } },
  })

  const roleDefaults = user?.jobRoleId
    ? await prisma.jobRolePhaseCode.findMany({
        where: { jobRoleId: user.jobRoleId, laborCode: { isActive: true } },
        select: { laborCode: { select: { id: true, code: true, name: true } } },
      })
    : []

  const roleDefaultCodes: AllowedPhaseCode[] = roleDefaults.map((x) => x.laborCode)
  const allowedIds = new Set(roleDefaultCodes.map((x) => x.id))

  const overrides = await prisma.userPhaseCodeOverride.findMany({
    where: { userId },
    select: {
      mode: true,
      laborCode: { select: { id: true, code: true, name: true, isActive: true } },
    },
  })

  const overrideRows = overrides
    .filter((o) => o.laborCode.isActive)
    .map((o) => ({
      laborCodeId: o.laborCode.id,
      code: o.laborCode.code,
      name: o.laborCode.name,
      mode: o.mode,
    }))

  for (const o of overrideRows) {
    if (o.mode === 'ALLOW') allowedIds.add(o.laborCodeId)
    if (o.mode === 'DENY') allowedIds.delete(o.laborCodeId)
  }

  // Category model:
  // - Everyone (including admins) is restricted by Category defaults when a Category is assigned.
  // - Backward-compatible default: if no Category and no overrides exist, show all active codes (so nothing "disappears").
  const hasAnyRule = Boolean(user?.jobRoleId) || overrideRows.length > 0

  const effective = !hasAnyRule
    ? await prisma.laborCode.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: [{ code: 'asc' }],
        take: 5000,
      })
    : allowedIds.size
      ? await prisma.laborCode.findMany({
          where: { id: { in: Array.from(allowedIds) }, isActive: true },
          select: { id: true, code: true, name: true },
          orderBy: [{ code: 'asc' }],
        })
      : []

  return {
    role: user?.jobRole || null,
    roleDefaults: roleDefaultCodes.sort((a, b) => a.code.localeCompare(b.code)),
    overrides: overrideRows.sort((a, b) => a.code.localeCompare(b.code)),
    effective,
  }
}

