import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function normalizeLine(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseMoney(s: string) {
  const cleaned = s.replace(/[^0-9.]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

type ExtractedLine = {
  raw: string
  description: string
  quantity: number | null
  unitPrice: number | null
}

function extractCandidateLines(text: string): ExtractedLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const out: ExtractedLine[] = []

  for (const raw of lines) {
    // Heuristic: line contains a $ amount and a qty number somewhere.
    if (!/\$/.test(raw)) continue

    const moneyMatches = raw.match(/\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g)
    const qtyMatch = raw.match(/\bqty\b\s*[:#]?\s*(\d+)\b/i) || raw.match(/\b(\d+)\s*(?:ea|each|pcs|pc)\b/i)

    const unitPrice = moneyMatches?.length ? parseMoney(moneyMatches[moneyMatches.length - 1]!) : null
    const quantity = qtyMatch ? Number(qtyMatch[1]) : null

    // Skip totals/shipping lines where qty is missing and description is too short
    if (!quantity && raw.length < 12) continue

    const description = raw
      .replace(/\bqty\b\s*[:#]?\s*\d+\b/gi, '')
      .replace(/\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    out.push({ raw, description: description || raw, quantity, unitPrice })
  }

  return out.slice(0, 400)
}

function scoreMatch(extracted: ExtractedLine, item: { description: string; quantity: number }) {
  const a = normalizeLine(extracted.description)
  const b = normalizeLine(item.description)
  if (!a || !b) return 0

  // Token overlap score.
  const at = new Set(a.split(' ').filter((t) => t.length >= 3))
  const bt = new Set(b.split(' ').filter((t) => t.length >= 3))
  const inter = Array.from(at).filter((t) => bt.has(t)).length
  const denom = Math.max(1, Math.min(at.size, bt.size))
  let score = inter / denom

  // Qty hint.
  if (extracted.quantity != null) {
    score += extracted.quantity === item.quantity ? 0.2 : 0
  }

  return score
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poId: string }> | { poId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const poId = resolved.poId

  const url = new URL(req.url)
  const apply = url.searchParams.get('apply') === 'true'

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    if (!po) return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 })

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Missing file' }, { status: 400 })
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ success: false, error: 'File must be a PDF' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const mod: any = await import('pdf-parse')
    const pdfParse: any = mod?.default ?? mod
    const parsed = await pdfParse(buf)
    const text = String(parsed.text || '').trim()
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Could not extract text from PDF (it may be a scanned image). Use a text-based PDF or provide CSV.' },
        { status: 400 }
      )
    }

    const extracted = extractCandidateLines(text)

    const proposals = extracted
      .map((line) => {
        let best: { id: string; score: number; description: string; quantity: number; unitPrice: number } | null = null
        for (const it of po.items) {
          const s = scoreMatch(line, { description: it.description, quantity: it.quantity })
          if (!best || s > best.score) best = { id: it.id, score: s, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice }
        }
        const confidence = best?.score ?? 0
        const matchedItemId = confidence >= 0.55 ? best!.id : null
        const proposedUnitPrice = line.unitPrice
        const wouldUpdate =
          !!matchedItemId &&
          proposedUnitPrice != null &&
          Number.isFinite(proposedUnitPrice) &&
          Math.abs(Number(proposedUnitPrice) - Number(best!.unitPrice)) > 0.0001
        return {
          raw: line.raw,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          matchedItemId,
          matchScore: confidence,
          matchedDescription: matchedItemId ? best!.description : null,
          currentUnitPrice: matchedItemId ? best!.unitPrice : null,
          proposedUnitPrice,
          wouldUpdate,
        }
      })
      .filter((p) => p.matchedItemId && p.wouldUpdate)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, 200)

    if (!apply) {
      return NextResponse.json({
        success: true,
        data: {
          poId,
          extractedCount: extracted.length,
          proposedUpdates: proposals,
          note: 'Preview only. Re-run with ?apply=true to apply updates.',
        },
      })
    }

    let updatedCount = 0
    for (const p of proposals) {
      if (!p.matchedItemId || p.proposedUnitPrice == null) continue
      await prisma.purchaseOrderItem.update({
        where: { id: p.matchedItemId },
        data: {
          unitPrice: p.proposedUnitPrice,
          totalPrice: p.proposedUnitPrice * (po.items.find((x) => x.id === p.matchedItemId)?.quantity ?? 1),
        },
      })
      updatedCount++
    }

    return NextResponse.json({ success: true, data: { poId, updatedCount } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import PDF'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

