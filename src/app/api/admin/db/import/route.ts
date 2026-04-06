import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { importDatabaseSnapshot } from '@/lib/admin/db-import'
import { parseDbExportPayload } from '@/lib/admin/db-export-schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/admin/db/import
 * Admin-only: merge JSON snapshot (same shape as export) into the database by upserting rows by id.
 * Send JSON body, or multipart form with field name "file" (.json).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin(session.user)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    let raw: unknown

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
        return NextResponse.json({ success: false, error: 'Missing file field "file"' }, { status: 400 })
      }
      const text = await (file as Blob).text()
      raw = JSON.parse(text) as unknown
    } else {
      raw = (await request.json()) as unknown
    }

    const payload = parseDbExportPayload(raw)

    const result = await prisma.$transaction(
      async (tx) => importDatabaseSnapshot(tx, payload),
      { maxWait: 120_000, timeout: 280_000 }
    )

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Import failed'
    console.error('[admin/db/import]', error)
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
