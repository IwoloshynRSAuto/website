import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { getWeeklyApprovals, parseAndNormalizeWeekStart } from '@modules/timekeeping/api/weekly-approvals'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const weekStartRaw = searchParams.get('weekStart')
    if (!weekStartRaw) {
      return NextResponse.json({ success: false, error: 'weekStart is required' }, { status: 400 })
    }

    const includeInactive = searchParams.get('includeInactive') === 'true'

    const { weekStart, weekEnd } = parseAndNormalizeWeekStart(weekStartRaw)
    const data = await getWeeklyApprovals({ weekStart, weekEnd, includeInactive })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load weekly approvals' },
      { status: 500 }
    )
  }
}

