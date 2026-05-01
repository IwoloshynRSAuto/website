import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import * as XLSX from 'xlsx'

function normalizeCell(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim()
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/[^a-z0-9]/g, '')
}

function parseDateOnlyToUtcNoonFromUnknown(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0))
  }
  const raw = String(value).trim()
  if (!raw) return null
  const num = Number(raw)
  if (Number.isFinite(num) && num >= 20000 && num <= 80000) {
    // Excel serial
    const excelEpochUtcMs = Date.UTC(1899, 11, 30)
    const d = new Date(excelEpochUtcMs + num * 24 * 60 * 60 * 1000)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0))
  }
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0))
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0))
}

function findReportDateAnchor(rows: unknown[][], headerRowIndex: number): Date | null {
  // Many report exports include a single report date somewhere above the header row.
  // We scan the pre-header rows for any cell that looks like a date.
  const max = Math.min(headerRowIndex, 20)
  for (let r = 0; r < max; r++) {
    const row = rows[r] || []
    for (let c = 0; c < Math.min(row.length, 30); c++) {
      const d = parseDateOnlyToUtcNoonFromUnknown(row[c])
      if (d) return d
    }
  }
  return null
}

function parseExcelSerialDateTimeToUtc(value: number): Date | null {
  if (!Number.isFinite(value)) return null
  // Excel serial date (days since 1899-12-30). Can include fraction for time.
  // Guard against tiny fractions that are time-only.
  if (value < 1) return null
  const excelEpochUtcMs = Date.UTC(1899, 11, 30)
  return new Date(excelEpochUtcMs + value * 24 * 60 * 60 * 1000)
}

function parseDateTimeFromUnknown(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'number') {
    // Could be Excel datetime serial or time fraction
    const dt = parseExcelSerialDateTimeToUtc(value)
    if (dt) return dt
    return null
  }
  const raw = String(value).trim()
  if (!raw) return null
  // only treat as datetime if it looks like a datetime (avoid "1200" etc)
  if (!/[-/T:]/.test(raw)) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function parseStartTime(dateAnchorUtcNoon: Date, startValue: unknown): Date | null {
  if (startValue == null) return null
  if (startValue instanceof Date && !Number.isNaN(startValue.getTime())) return startValue

  // If Excel time fraction (native numeric cell)
  if (typeof startValue === 'number' && Number.isFinite(startValue) && startValue > 0 && startValue < 1) {
    const asNum = startValue
    const totalMin = Math.round(asNum * 24 * 60)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    const d = new Date(dateAnchorUtcNoon)
    d.setUTCHours(h, m, 0, 0)
    return d
  }

  // Excel datetime serial (days since 1899-12-30), includes date + time
  if (typeof startValue === 'number' && Number.isFinite(startValue) && startValue >= 1) {
    const excelEpochUtcMs = Date.UTC(1899, 11, 30)
    const dt = new Date(excelEpochUtcMs + startValue * 24 * 60 * 60 * 1000)
    if (!Number.isNaN(dt.getTime())) return dt
  }

  const raw = String(startValue).trim()
  if (!raw) return null

  // Digits-only shorthand, e.g. 930 -> 9:30, 1200 -> 12:00 (assume local-style 12-hour if <= 1259; otherwise 24-hour)
  const digitsOnly = raw.match(/^(\d{3,4})$/)
  if (digitsOnly) {
    const d = digitsOnly[1]
    const hoursPart = d.slice(0, d.length - 2)
    const minutesPart = d.slice(-2)
    let h = Number(hoursPart)
    const m = Number(minutesPart)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    if (m < 0 || m > 59) return null
    // If 1-12, treat as 12-hour without AM/PM (heuristic will map 1-6 to PM via convert12To24Hour)
    if (h >= 1 && h <= 12) {
      const t24 = (() => {
        // inline minimal convert12To24Hour logic for "H:MM" without period:
        if (h >= 1 && h <= 6) return `${String(h + 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        if (h === 12) return `12:${String(m).padStart(2, '0')}`
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      })()
      const [hh24, mm24] = t24.split(':').map(Number)
      const out = new Date(dateAnchorUtcNoon)
      out.setUTCHours(hh24, mm24, 0, 0)
      return out
    }
    // Otherwise treat as 24-hour HHMM (e.g. 1330)
    if (h < 0 || h > 23) return null
    const out = new Date(dateAnchorUtcNoon)
    out.setUTCHours(h, m, 0, 0)
    return out
  }

  // If full datetime-like string, accept it (but avoid pure digits cases above)
  const dt = new Date(raw)
  if (!Number.isNaN(dt.getTime()) && /[-/T:]/.test(raw)) return dt

  // Parse HH:MM with optional AM/PM
  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!match) return null
  let h = Number(match[1])
  const m = Number(match[2])
  const period = (match[3] || '').toUpperCase()
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0

  const d = new Date(dateAnchorUtcNoon)
  d.setUTCHours(h, m, 0, 0)
  return d
}

function splitJobAndPhaseFromCell(value: unknown): { jobToken: string; phase: string | null } {
  // Mirrors src/app/api/timesheets/import/route.ts: handles "E3948 CD" or "E3973CD" → job + 2-letter phase suffix.
  const raw = String(value ?? '').trim().replace(/ /g, ' ').replace(/[–—]/g, '-')
  if (!raw) return { jobToken: '', phase: null }
  // spaced form: "<job> <PHASE>"
  const spaced = raw.match(/^(\S+)\s+([A-Za-z]{2})$/)
  if (spaced) return { jobToken: spaced[1], phase: spaced[2].toUpperCase() }
  // compact form: trailing 2-letter alpha after digits, e.g. "E3973CD" or "1355CD"
  const compact = raw.match(/^([0-9A-Za-z]*?\d)([A-Za-z]{2})$/)
  if (compact) return { jobToken: compact[1], phase: compact[2].toUpperCase() }
  return { jobToken: raw, phase: null }
}

function normalizeJobKey(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return ''
  // common patterns: "1355A - Title", "Job Number: 1355A", "1355A/PM", etc.
  // keep only the first "job-ish" token we can find.
  const cleaned = raw
    .replace(/\u00a0/g, ' ') // nbsp
    .replace(/[–—]/g, '-') // en/em dash → hyphen
    .replace(/\s+/g, ' ')
    .trim()

  // prefer first alphanumeric run like 1355A, S3948, 1355A01, etc.
  const tokenMatch = cleaned.match(/[a-z0-9]+/i)
  const token = (tokenMatch?.[0] || cleaned.split(' ')[0] || '').trim()
  if (!token) return ''

  const key = token.replace(/[^a-z0-9]/gi, '').toLowerCase()
  // strip leading zeros for numeric job numbers like 000123
  const keyNoZeros = key.replace(/^0+(\d)/, '$1')
  return keyNoZeros
}

function normalizeJobNumber(value: string): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  const withoutQuotes = trimmed.replace(/^"+|"+$/g, '')
  const noWhitespace = withoutQuotes.replace(/\s+/g, '')
  return noWhitespace.replace(/\.0+$/, '')
}

function extractJobNumberFromText(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/^"+|"+$/g, '')
  if (!raw) return ''

  // Try to pull a job-like token even if the cell includes title/extra text.
  // Examples: "1355A — RSA Cont. Improvements", "Job: 1355A", "E3374 RSA Continuous Improvement"
  const m = raw.match(/([A-Za-z]+\d{2,6}[A-Za-z]?|\d{3,6}[A-Za-z]+)/)
  if (m?.[1]) {
    const normalized = normalizeJobNumber(m[1])
    if (normalized === '0') return ''
    return normalized
  }

  // Fall back to the first alphanumeric token.
  const token = raw.match(/[A-Za-z0-9]+/)?.[0] || ''
  const normalized = normalizeJobNumber(token)
  return normalized === '0' ? '' : normalized
}

async function ensureJobForImport(
  rawJobCell: unknown,
  createdById: string,
  jobsByNormalized: Map<string, string>
): Promise<string> {
  const extracted = extractJobNumberFromText(rawJobCell)
  const key = normalizeJobNumber(extracted)
  if (!key) return ''

  const existing = jobsByNormalized.get(key.toLowerCase()) || jobsByNormalized.get(normalizeJobKey(key)) || null
  if (existing) return existing

  const base = extracted || `IMP-${Date.now()}`
  let jobNumber = base
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      const created = await prisma.job.create({
        data: {
          jobNumber,
          title: `Imported — ${jobNumber}`,
          createdById,
        },
        select: { id: true, jobNumber: true },
      })
      const norm = normalizeJobNumber(created.jobNumber).toLowerCase()
      jobsByNormalized.set(norm, created.id)
      const normKey = normalizeJobKey(created.jobNumber)
      if (normKey) jobsByNormalized.set(normKey, created.id)
      return created.id
    } catch (e: any) {
      const code = e?.code
      if (code === 'P2002') {
        jobNumber = `${base}-${attempt + 1}`
        continue
      }
      throw e
    }
  }
  throw new Error(`Could not create job for ${base}`)
}

function roundToNearest15Minutes(date: Date): Date {
  const d = new Date(date)
  const minutes = d.getMinutes()
  const roundedMinutes = Math.round(minutes / 15) * 15
  d.setSeconds(0, 0)
  if (roundedMinutes === 60) {
    d.setMinutes(0)
    d.setHours(d.getHours() + 1)
  } else {
    d.setMinutes(roundedMinutes)
  }
  return d
}

function lookupJobIdFromCell(rawJobCell: unknown, jobsByNumber: Map<string, string>): string | null {
  const raw = String(rawJobCell ?? '').trim().toLowerCase().replace(/\u00a0/g, ' ')
  if (raw) {
    const direct = jobsByNumber.get(raw)
    if (direct) return direct
  }

  // Always prefer extracting a job-like token (e.g., 1355A, E3374) from messy text
  const extracted = extractJobNumberFromText(rawJobCell)
  const extractedLower = extracted.trim().toLowerCase()
  if (extractedLower) {
    const directExtracted = jobsByNumber.get(extractedLower)
    if (directExtracted) return directExtracted
    const n2 = normalizeJobNumber(extractedLower).toLowerCase()
    const byNorm = jobsByNumber.get(n2)
    if (byNorm) return byNorm
    const normKey = normalizeJobKey(extractedLower)
    if (normKey) {
      const byKey = jobsByNumber.get(normKey)
      if (byKey) return byKey
    }
  }

  // Fall back to the older heuristic
  const normKeyLegacy = normalizeJobKey(rawJobCell)
  if (normKeyLegacy) {
    const byLegacy = jobsByNumber.get(normKeyLegacy)
    if (byLegacy) return byLegacy
  }

  return null
}

function findJobCellFromRow(row: unknown[], preferCol: number): unknown {
  const preferred = preferCol >= 0 ? row[preferCol] : null
  const preferredStr = String(preferred ?? '').trim()
  if (preferredStr) return preferred

  // If the chosen "job" column is empty (merged cells / different layout),
  // scan the row left-to-right for a job-like token.
  for (const cell of row) {
    const extracted = extractJobNumberFromText(cell)
    // Guard: don't accidentally treat time cells ("11:00") or small numbers as jobs.
    // Prefer tokens that contain at least one letter and one digit (typical job numbers: 1355A, E3374).
    if (!extracted) continue
    if (extracted.includes(':')) continue
    if (!(/[a-z]/i.test(extracted) && /\d/.test(extracted))) continue
    if (extracted.length < 4) continue
    return cell
  }
  return preferred
}

function findStartCellFromRow(row: unknown[], dateAnchor: Date, preferCol: number): unknown {
  const preferred = preferCol >= 0 ? row[preferCol] : null
  if (parseStartTime(dateAnchor, preferred)) return preferred
  for (const cell of row) {
    if (parseStartTime(dateAnchor, cell)) return cell
  }
  return preferred
}

/**
 * Detects a TRUE side-by-side layout where multiple day+date headers appear
 * in the SAME ROW (e.g. "Sunday 3/15" and "Monday 3/16" side by side).
 * (Copied in spirit from the original timekeeping importer.)
 */
function detectSheet1Layout(sheet: XLSX.WorkSheet): boolean {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
  })
  const DAY_DATE_RE = /(sun|mon|tue|wed|thu|fri|sat)[a-z]*[^0-9]*\d{1,2}[\/\-]\d{1,2}/i
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const count = (rows[r] || []).filter((c) => DAY_DATE_RE.test(String(c || '').trim())).length
    if (count >= 2) return true
  }
  return false
}

/**
 * Detects a vertically-stacked day-section layout (PROJECT LABOR REPORT style).
 * (Copied in spirit from the original timekeeping importer.)
 */
function detectVerticalSections(sheet: XLSX.WorkSheet): boolean {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
  })
  const DAY_NAMES_RE = /(sun|mon|tue|wed|thu|fri|sat)/i
  const DATE_RE = /\d{1,2}[\/\-]\d{1,2}/
  let dayDateRowCount = 0
  let startTimeRowCount = 0
  for (let r = 0; r < Math.min(rows.length, 150); r++) {
    const rawRow = rows[r] || []
    const values: string[] = Array.from({ length: (rawRow as any[]).length }, (_, i) => {
      const v = (rawRow as any[])[i]
      return v != null ? String(v).trim() : ''
    })
    const hasDayDate =
      values.some((v) => v && DAY_NAMES_RE.test(v) && DATE_RE.test(v)) ||
      values.some((v, i) => {
        if (!v || !DAY_NAMES_RE.test(v)) return false
        for (let cc = i + 1; cc <= Math.min(values.length - 1, i + 3); cc++) {
          if (values[cc] && DATE_RE.test(values[cc])) return true
        }
        return false
      })
    if (hasDayDate) dayDateRowCount++
    const normed = values.map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ''))
    const startTimesInRow = normed.filter((v) => v === 'starttime').length
    if (startTimesInRow === 1 && normed.includes('jobnumber')) startTimeRowCount++
  }
  return dayDateRowCount >= 2 && startTimeRowCount >= 2
}

function excelSerialToDateTime(value: number): Date {
  const excelEpochUtcMs = Date.UTC(1899, 11, 30)
  return new Date(excelEpochUtcMs + value * 24 * 60 * 60 * 1000)
}

function diffHoursRoundedQuarter(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  const hours = ms / 3_600_000
  return Math.round(hours * 4) / 4
}

function parseDayDateCell(value: string, hintYear: number): Date | null {
  const DATE_RE = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/
  const dm = value.match(DATE_RE)
  if (!dm) return null
  const month = Number(dm[1]) - 1
  const day = Number(dm[2])
  let year = hintYear
  if (dm[3]) {
    year = Number(dm[3])
    if (year < 100) year += 2000
  }
  const d = new Date(Date.UTC(year, month, day, 12, 0, 0, 0))
  return Number.isNaN(d.getTime()) ? null : d
}

async function importProjectLaborReportVertical(args: {
  sheet: XLSX.WorkSheet
  userId: string
  hintYear: number
}): Promise<{ inserted: number; rejected: number; errors: Array<{ line: number; reason: string }> } | null> {
  if (!detectVerticalSections(args.sheet)) return null

  const rowsRaw = XLSX.utils.sheet_to_json<(string | number | null)[]>(args.sheet, { header: 1, raw: true })
  const rowsFmt = XLSX.utils.sheet_to_json<(string | number | null)[]>(args.sheet, { header: 1, raw: false })
  if (!rowsFmt.length) return null

  const DAY_NAMES_RE = /(sun|mon|tue|wed|thu|fri|sat)/i

  let contextDate: Date | null = null
  let startCol = -1
  let endCol = -1
  let jobCol = -1
  let phaseCol = -1
  let notesCol = -1
  let hoursCol = -1

  let inserted = 0
  let rejected = 0
  const errors: Array<{ line: number; reason: string }> = []

  // preload jobs map (and allow auto-create like original)
  const jobs = await prisma.job.findMany({ select: { id: true, jobNumber: true } })
  const jobsByNumber = new Map<string, string>()
  for (const j of jobs) {
    const raw = String(j.jobNumber ?? '').trim().toLowerCase()
    if (raw) jobsByNumber.set(raw, j.id)
    const norm = normalizeJobKey(raw)
    if (norm) jobsByNumber.set(norm, j.id)
    const n2 = normalizeJobNumber(raw).toLowerCase()
    if (n2) jobsByNumber.set(n2, j.id)
  }

  // Convert raw Excel value + formatted string to {h,m}
  const toHM = (raw: unknown, fmt: unknown): { h: number; m: number } | null => {
    const rawNum = Number(raw)
    if (Number.isFinite(rawNum) && rawNum > 0 && rawNum < 1) {
      const totalMin = Math.round(rawNum * 24 * 60)
      return { h: Math.floor(totalMin / 60), m: totalMin % 60 }
    }
    if (Number.isFinite(rawNum) && rawNum >= 1) {
      const dt = excelSerialToDateTime(rawNum)
      if (!Number.isNaN(dt.getTime())) return { h: dt.getUTCHours(), m: dt.getUTCMinutes() }
    }
    const str = normalizeCell(fmt ?? raw ?? '')
    if (!str) return null
    const m = str.match(/^(\d{1,2}):(\d{2})(?::\d+)?(?:\s*(AM|PM))?$/i)
    if (!m) return null
    let h = Number(m[1])
    const min = Number(m[2])
    const period = (m[3] || '').toUpperCase()
    if (period === 'PM' && h !== 12) h += 12
    else if (period === 'AM' && h === 12) h = 0
    else if (!period && h >= 1 && h <= 6) h += 12
    return { h, m: min }
  }

  for (let r = 0; r < rowsFmt.length; r++) {
    const fmtRow = (rowsFmt[r] as any[]) || []
    const rawRow = (rowsRaw[r] as any[]) || []
    const values = fmtRow.map((c: unknown) => normalizeCell(c))
    const normed = values.map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ''))

    // day+date header row
    let foundHeader = false
    for (let c = 0; c < values.length && !foundHeader; c++) {
      const val = values[c]
      if (!val || !DAY_NAMES_RE.test(val)) continue
      // date could be in this or adjacent cells
      let d: Date | null = parseDayDateCell(val, args.hintYear)
      if (!d) {
        for (let cc = c + 1; cc <= Math.min(values.length - 1, c + 4) && !d; cc++) {
          d = parseDayDateCell(values[cc], args.hintYear)
        }
      }
      if (d) {
        contextDate = d
        foundHeader = true
      }
    }

    // column header row
    if (normed.includes('starttime') && normed.includes('jobnumber')) {
      startCol = normed.findIndex((v) => v === 'starttime')
      endCol = normed.findIndex((v) => v === 'endtime')
      hoursCol = normed.findIndex((v) => v === 'hours' || v === 'hoursworked' || v === 'duration' || v === 'hrs')
      jobCol = normed.findIndex((v) => v === 'jobnumber')
      phaseCol = normed.findIndex((v) => v === 'phase' || v === 'phasecode' || v === 'laborcode')
      notesCol = normed.findIndex((v) => v === 'notes' || v === 'note' || v === 'description' || v === 'desc')
      continue
    }

    // data row
    if (!contextDate || startCol < 0 || jobCol < 0) continue
    const jobCell = findJobCellFromRow(values, jobCol)
    if (!jobCell) continue

    const startHM = toHM(rawRow[startCol], fmtRow[startCol])
    if (!startHM) continue
    const start = new Date(contextDate)
    start.setUTCHours(startHM.h, startHM.m, 0, 0)
    const startRounded = roundToNearest15Minutes(start)

    let hoursNum = hoursCol >= 0 ? Number(String(rawRow[hoursCol] ?? '').toString().trim()) : NaN
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
      if (endCol >= 0) {
        const endHM = toHM(rawRow[endCol], fmtRow[endCol])
        if (endHM) {
          const end = new Date(contextDate)
          end.setUTCHours(endHM.h, endHM.m, 0, 0)
          hoursNum = diffHoursRoundedQuarter(startRounded, end)
        }
      }
    }
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
      rejected++
      errors.push({ line: r + 1, reason: 'Invalid Hours' })
      continue
    }

    const { jobToken, phase: phaseFromJob } = splitJobAndPhaseFromCell(jobCell)
    const jobLookup = jobToken || jobCell
    const jobKeyRaw = String(jobLookup ?? '').trim().toLowerCase()
    const jobKeyNorm = normalizeJobKey(jobLookup)
    const jobId = jobsByNumber.get(jobKeyRaw) || (jobKeyNorm ? jobsByNumber.get(jobKeyNorm) : null) || null
    if (!jobId) {
      // Import without job link; user can set job in UI.
      errors.push({ line: r + 1, reason: `Unknown Job (imported without job): ${String(jobCell ?? '').trim()}` })
    }

    const phaseCode = (() => {
      const fromCol = phaseCol >= 0 ? normalizeCell(values[phaseCol]) : ''
      if (fromCol) return fromCol.toUpperCase()
      if (phaseFromJob) return phaseFromJob
      return null
    })()
    const notes = notesCol >= 0 ? normalizeCell(values[notesCol]) : ''

    try {
      await prisma.devTimeEntry.create({
        data: {
          userId: args.userId,
          jobId,
          date: contextDate,
          startTime: startRounded,
          endTime: null,
          hoursWorked: new Prisma.Decimal(hoursNum),
          phaseCode,
          notes: notes || null,
        },
      })
      inserted++
    } catch (e: any) {
      rejected++
      errors.push({ line: r + 1, reason: e?.message || 'Insert failed' })
    }
  }

  return { inserted, rejected, errors }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: '.xlsx file is required' }, { status: 400 })
    }

    const fileName = (file as File).name?.toLowerCase() || ''
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')
    if (!isExcel) {
      return NextResponse.json({ success: false, error: 'Only Excel files are supported' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    if (!workbook.SheetNames.length) {
      return NextResponse.json({ success: false, error: 'Excel file has no sheets' }, { status: 400 })
    }

    // Pick the best sheet instead of assuming the first tab.
    // Many exports include cover sheets or summary tabs before the actual data.
    const pickSheet = () => {
      let best: null | { name: string; sheet: XLSX.WorkSheet; rows: unknown[][]; headerRowIndexGuess: number; score: number } = null
      for (const name of workbook.SheetNames) {
        const sh = workbook.Sheets[name]
        if (!sh) continue
        const candidateRows = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, raw: true, defval: '' }) as unknown[][]
        if (!candidateRows || candidateRows.length < 2) continue

        // Score the first 20 rows as potential headers by presence of key normalized columns.
        const maxScan = Math.min(candidateRows.length, 20)
        let bestScore = -1
        let bestIdx = 0
        for (let i = 0; i < maxScan; i++) {
          const headerRow = candidateRows[i] || []
          const headers = (headerRow as unknown[]).map(normalizeHeader)
          const has = (pred: (h: string) => boolean) => (headers.findIndex(pred) >= 0 ? 1 : 0)
          const score =
            has((h) => h === 'job' || h === 'jobnumber' || h === 'project' || h === 'projectnumber') +
            has((h) => h === 'starttime' || h === 'start' || h === 'clockin' || h === 'clockintime' || h === 'begintime') +
            (has((h) => h === 'hours' || h === 'hoursworked' || h === 'duration' || h === 'hrs') ||
            has((h) => h === 'endtime' || h === 'end' || h === 'clockout' || h === 'clockouttime')
              ? 1
              : 0) +
            0.5 * has((h) => h === 'date' || h === 'workdate' || h === 'day') +
            0.25 * has((h) => h === 'phasecode' || h === 'phase' || h === 'laborcode') +
            0.25 * has((h) => h === 'notes' || h === 'note' || h === 'description' || h === 'desc')

          if (score > bestScore) {
            bestScore = score
            bestIdx = i
          }
        }

        const overallScore = bestScore + Math.min(1, candidateRows.length / 50) // tiny nudge for real data sheets
        if (!best || overallScore > best.score) {
          best = { name, sheet: sh, rows: candidateRows, headerRowIndexGuess: bestIdx, score: overallScore }
        }
      }
      return best
    }

    const picked = pickSheet()
    if (!picked) {
      return NextResponse.json({ success: false, error: 'No importable sheets found in Excel file' }, { status: 400 })
    }

    // First try the "old importer" Project Labor Report layout(s).
    // If the sheet matches vertical sections, import using that logic.
    // (This is the format that the original timekeeping import handles well.)
    const hintYear = new Date().getFullYear()
    const oldStyleVertical = await importProjectLaborReportVertical({
      sheet: picked.sheet,
      userId: session.user.id,
      hintYear,
    })
    if (oldStyleVertical && oldStyleVertical.inserted > 0) {
      return NextResponse.json({
        success: true,
        data: {
          inserted: oldStyleVertical.inserted,
          rejected: oldStyleVertical.rejected,
          errors: oldStyleVertical.errors.slice(0, 200),
        },
      })
    }

    const rows = picked.rows

    const findHeaderRow = () => {
      // Some exports include title rows before the real header row (e.g., "REPORT", company name, etc.).
      // Scan the first N rows and pick the one that best matches our expected headers.
      const maxScan = Math.min(rows.length, 20)
      let best: null | {
        idx: number
        headerRow: unknown[]
        headers: string[]
        colDate: number
        colStart: number
        colHours: number
        colJob: number
        colDesc: number
        colPhase: number
        score: number
      } = null

      const scoreRow = (headers: string[]) => {
        const colDate = headers.findIndex(
          (h) =>
            h === 'date' ||
            h === 'workdate' ||
            h === 'day' ||
            h === 'entrydate' ||
            h === 'taskdate' ||
            h === 'clockindate'
        )
        const colStart = headers.findIndex(
          (h) =>
            h === 'starttime' ||
            h === 'start' ||
            h === 'time' ||
            h === 'startat' ||
            h === 'startclock' ||
            h === 'clockin' ||
            h === 'clockintime' ||
            h === 'begin' ||
            h === 'begintime'
        )
        const colHours = headers.findIndex(
          (h) =>
            h === 'hours' ||
            h === 'hour' ||
            h === 'hoursworked' ||
            h === 'duration' ||
            h === 'durationhrs' ||
            h === 'durationhours' ||
            h === 'timeworked' ||
            h === 'totalhours' ||
            h === 'qty' ||
            h === 'quantity' ||
            h === 'hrs' ||
            h === 'hr' ||
            h === 'regularhours' ||
            h === 'regulartime' ||
            h === 'laborhours'
        )
        const colEnd = headers.findIndex((h) => h === 'endtime' || h === 'end' || h === 'clockout' || h === 'clockouttime' || h === 'finish' || h === 'finishtime')
        const colJob = headers.findIndex(
          (h) =>
            h === 'job' ||
            h === 'jobnumber' ||
            h === 'jobno' ||
            h === 'jobcode' ||
            h === 'job#' ||
            h === 'project' ||
            h === 'projectnumber' ||
            h === 'projectno'
        )
        const colDesc = headers.findIndex((h) => h === 'description' || h === 'desc' || h === 'note' || h === 'notes')
        const colPhase = headers.findIndex(
          (h) => h === 'phasecode' || h === 'phase' || h === 'laborcode' || h === 'labor' || h === 'phaselabor'
        )

        const has = (i: number) => (i >= 0 ? 1 : 0)
        // Require the core 3; job/desc add confidence.
        // allow End Time to stand in for Hours (start+end => duration)
        const hasHoursLike = has(colHours) || has(colEnd)
        const score = has(colDate) + has(colStart) + hasHoursLike + 0.5 * has(colJob) + 0.25 * has(colDesc) + 0.25 * has(colPhase)
        return { colDate, colStart, colHours, colJob, colDesc, colPhase, score }
      }

      for (let i = 0; i < maxScan; i++) {
        const headerRow = rows[i] || []
        const headers = (headerRow as unknown[]).map(normalizeHeader)
        const { colDate, colStart, colHours, colJob, colDesc, colPhase, score } = scoreRow(headers)
        if (!best || score > best.score) {
          best = { idx: i, headerRow, headers, colDate, colStart, colHours, colJob, colDesc, colPhase, score }
        }
        // early exit if we found all required columns plus job
        if (score >= 3.5) break
      }

      return best
    }

    const headerPick = findHeaderRow()
    const headerRow = headerPick?.headerRow || rows[0] || []
    const headers = headerPick?.headers || (headerRow as unknown[]).map(normalizeHeader)
    let reportDateAnchor = findReportDateAnchor(rows, headerPick?.idx ?? 0)

    const colDate = headerPick?.colDate ?? headers.findIndex((h) => h === 'date' || h === 'workdate')
    const colStart = headerPick?.colStart ?? headers.findIndex((h) => h === 'starttime' || h === 'start')
    const colHours =
      headerPick?.colHours ??
      headers.findIndex(
        (h) =>
          h === 'hours' ||
          h === 'hour' ||
          h === 'hoursworked' ||
          h === 'duration' ||
          h === 'durationhrs' ||
          h === 'durationhours' ||
          h === 'timeworked' ||
          h === 'totalhours' ||
          h === 'hrs' ||
          h === 'hr'
      )
    const colEnd = headers.findIndex(
      (h) => h === 'endtime' || h === 'end' || h === 'clockout' || h === 'clockouttime' || h === 'finish' || h === 'finishtime'
    )
    const colJob = headerPick?.colJob ?? headers.findIndex((h) => h === 'job' || h === 'jobnumber')
    const colDesc = headerPick?.colDesc ?? headers.findIndex((h) => h === 'description' || h === 'desc' || h === 'note' || h === 'notes')
    const colPhase =
      headerPick?.colPhase ??
      headers.findIndex((h) => h === 'phasecode' || h === 'phase' || h === 'laborcode' || h === 'labor' || h === 'phaselabor')

    // If we couldn't detect any report date, fall back to "today" so time-only rows are still importable.
    // (Some exports have no Date column and time-only Start Time cells.)
    if (!reportDateAnchor) {
      const now = new Date()
      reportDateAnchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0))
    }

    // Date column is optional if Start Time includes a full date (common in "Project Labor Report" exports).
    if (colStart < 0 || (colHours < 0 && colEnd < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required columns. Need: Start Time, and either Hours/Duration or End Time',
          details: { detectedHeaders: headerRow, normalizedHeaders: headers, headerRowIndex: headerPick?.idx ?? 0 },
        },
        { status: 400 }
      )
    }
    if (colJob < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required column: Job (Job Number)',
          details: { detectedHeaders: headerRow, normalizedHeaders: headers, headerRowIndex: headerPick?.idx ?? 0 },
        },
        { status: 400 }
      )
    }

    let inserted = 0
    let rejected = 0
    const errors: Array<{ line: number; reason: string }> = []

    // Import should allow historical/completed jobs too (reports often include them).
    const jobs = await prisma.job.findMany({
      select: { id: true, jobNumber: true },
    })
    const jobsByNumber = new Map<string, string>()
    for (const j of jobs) {
      const raw = String(j.jobNumber ?? '').trim().toLowerCase()
      if (raw) jobsByNumber.set(raw, j.id)
      const norm = normalizeJobKey(raw)
      if (norm) jobsByNumber.set(norm, j.id)
      // also store stripped-leading-zeros variant
      const rawNoZeros = raw.replace(/^0+(\d)/, '$1')
      if (rawNoZeros) jobsByNumber.set(rawNoZeros, j.id)
      const n2 = normalizeJobNumber(raw).toLowerCase()
      if (n2) jobsByNumber.set(n2, j.id)
    }

    // optional: clear existing entries in the imported date range if user requests later
    const startRow = (headerPick?.idx ?? 0) + 1
    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r] || []
      const rawStart = findStartCellFromRow(row as unknown[], reportDateAnchor!, colStart)
      const rawHours = colHours >= 0 ? row[colHours] : ''
      const rawEnd = colEnd >= 0 ? row[colEnd] : ''
      const rawJob = findJobCellFromRow(row as unknown[], colJob)
      const rawDesc = colDesc >= 0 ? row[colDesc] : ''
      const rawPhase = colPhase >= 0 ? row[colPhase] : ''

      const dateFromCol = colDate >= 0 ? parseDateOnlyToUtcNoonFromUnknown(row[colDate]) : null
      const dateAnchor = dateFromCol || reportDateAnchor

      // If the Job cell carries a trailing phase suffix like "E3948 CD", split it out.
      const { jobToken, phase: phaseFromJob } = splitJobAndPhaseFromCell(rawJob)
      const jobLookupValue = jobToken || rawJob
      const jobId = lookupJobIdFromCell(jobLookupValue, jobsByNumber)
      const extractedJobNumber = extractJobNumberFromText(jobLookupValue)
      const resolvedJobId =
        jobId ||
        null
      if (!resolvedJobId) {
        // Don't hard-fail the entire import when the job number isn't present in the sheet row.
        // We'll still import the time row with jobId = null so the user can fix it in the UI.
        errors.push({
          line: r + 1,
          reason: `Unknown Job (imported without job): ${String(rawJob ?? '').trim()} (extracted: ${extractedJobNumber || 'n/a'})`,
        })
      }

      const phaseCode = (() => {
        const fromCol = String(rawPhase ?? '').trim()
        if (fromCol) return fromCol.toUpperCase()
        if (phaseFromJob) return phaseFromJob
        return null
      })()

      // Always use our best-guess date anchor for time-only cells.
      const startTime = parseStartTime(dateAnchor, rawStart)
      const startTimeWithDate = !startTime ? parseDateTimeFromUnknown(rawStart) : null
      const startResolved = startTimeWithDate || startTime
      const dateAnchorResolved =
        dateAnchor ||
        (startTimeWithDate
          ? new Date(Date.UTC(startTimeWithDate.getUTCFullYear(), startTimeWithDate.getUTCMonth(), startTimeWithDate.getUTCDate(), 12, 0, 0, 0))
          : reportDateAnchor)

      const startResolvedFinal =
        startResolved ||
        (() => {
          const candidate = findStartCellFromRow(row as unknown[], dateAnchorResolved || reportDateAnchor!, -1)
          return parseStartTime(dateAnchorResolved || reportDateAnchor!, candidate)
        })()

      if (!startResolvedFinal) {
        rejected++
        errors.push({
          line: r + 1,
          reason: 'Invalid Start Time',
        })
        continue
      }
      const roundedStartTime = roundToNearest15Minutes(startResolvedFinal)

      let hoursNum = typeof rawHours === 'number' ? rawHours : Number(String(rawHours).trim())
      let endParsed: Date | null = null
      if (colEnd >= 0) {
        endParsed =
          parseStartTime(dateAnchorResolved, rawEnd) ||
          (!dateAnchorResolved ? parseDateTimeFromUnknown(rawEnd) : null)
      }
      if ((!Number.isFinite(hoursNum) || hoursNum <= 0) && endParsed) {
        const diffMs = endParsed.getTime() - startResolved.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        if (Number.isFinite(diffHours) && diffHours > 0) {
          hoursNum = Math.round(diffHours * 4) / 4
        }
      }
      if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
        rejected++
        errors.push({ line: r + 1, reason: 'Invalid Hours' })
        continue
      }

      try {
        await prisma.devTimeEntry.create({
          data: {
            userId: session.user.id,
            jobId: resolvedJobId,
            date: dateAnchorResolved || reportDateAnchor!,
            startTime: roundedStartTime,
            hoursWorked: new Prisma.Decimal(hoursNum),
            phaseCode,
            notes: String(rawDesc ?? '').trim() || null,
          },
        })
        inserted++
      } catch (e: any) {
        rejected++
        errors.push({ line: r + 1, reason: e?.message || 'Insert failed' })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        inserted,
        rejected,
        errors: errors.slice(0, 200),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Import failed' },
      { status: 500 }
    )
  }
}

