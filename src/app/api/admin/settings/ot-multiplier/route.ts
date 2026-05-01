import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import {
  DEFAULT_OT_MULTIPLIER,
  OT_MULTIPLIER_SETTING_KEY,
  getOtMultiplier,
  setDecimalSetting,
} from '@/lib/settings/system-settings'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const putSchema = z.object({
  otMultiplier: z.number().positive().finite(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const otMultiplier = await getOtMultiplier(prisma)
  return NextResponse.json({
    success: true,
    data: {
      key: OT_MULTIPLIER_SETTING_KEY,
      otMultiplier,
      defaultMultiplier: DEFAULT_OT_MULTIPLIER,
    },
  })
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const { otMultiplier } = putSchema.parse(body)
    await setDecimalSetting(prisma, OT_MULTIPLIER_SETTING_KEY, otMultiplier)
    return NextResponse.json({ success: true, data: { otMultiplier } })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: e.errors }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'Failed to save OT multiplier'
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
