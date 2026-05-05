import { NextResponse } from 'next/server'
import { RICKMASTER_ROWS } from '@/lib/quote-plans/rickmaster'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = RICKMASTER_ROWS.map((r) => {
    const code = String(r.code || '').trim().toUpperCase()
    const category = code.slice(0, 2) || '??'
    return {
      id: code,
      code,
      description: r.description,
      category,
      isActive: true,
    }
  })
  return NextResponse.json({ success: true, data })
}

