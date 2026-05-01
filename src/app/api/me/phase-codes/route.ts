import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllowedPhaseCodesForUser } from '@/lib/timekeeping/phase-code-access'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const codes = await getAllowedPhaseCodesForUser(session.user.id)
  return NextResponse.json({ success: true, data: codes })
}

