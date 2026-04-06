import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { buildDatabaseExportPayload, buildDatabaseExportWorkbookBuffer } from '@/lib/admin/db-export'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/admin/db/export?format=json|xlsx
 * Admin-only snapshot of core tables (JSON or Excel).
 */
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
    const format = (searchParams.get('format') || 'json').toLowerCase()
    const stamp = new Date().toISOString().split('T')[0]

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await buildDatabaseExportWorkbookBuffer()
      const filename = `database-export-${stamp}.xlsx`
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const payload = await buildDatabaseExportPayload()
    const body = JSON.stringify(payload, null, 2)
    const filename = `database-export-${stamp}.json`
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed'
    console.error('[admin/db/export]', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
