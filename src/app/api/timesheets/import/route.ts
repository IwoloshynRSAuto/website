import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { wallClockToUtcDate } from '@/lib/utils/import-timezone'
import * as XLSX from 'xlsx'

type ParsedRow = {
  line: number
  date: string
  jobNumber: string
  laborCode: string
  startTime: string
  endTime: string
  notes: string
}

function isLikelyNonDataRow(values: string[]): boolean {
  const joined = values.join(' ').toLowerCase()
  return (
    joined.includes('total') ||
    joined.includes('subtotal') ||
    joined.includes('signature') ||
    joined.includes('approved') ||
    joined.includes('manager') ||
    joined.includes('employee')
  )
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseLooseDate(value: string): Date | null {
  const raw = value.trim()
  if (!raw) return null
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) {
    // Excel serial dates are typically in this range for modern dates.
    if (numeric >= 20000 && numeric <= 80000) {
      const excelDate = excelSerialToDate(numeric)
      const y = excelDate.getFullYear()
      if (y >= 2000 && y <= 2100) return excelDate
    }
    return null
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    if (y >= 2000 && y <= 2100) return parsed
  }

  const ddMmm = raw.match(/^(\d{1,2})[-\/ ]([A-Za-z]{3,9})$/)
  if (ddMmm) {
    const currentYear = new Date().getFullYear()
    const guess = new Date(`${ddMmm[1]} ${ddMmm[2]} ${currentYear}`)
    if (!Number.isNaN(guess.getTime())) {
      const y = guess.getFullYear()
      if (y >= 2000 && y <= 2100) return guess
    }
  }
  return null
}

function extractDateFromNearbyCells(
  rows: (string | number)[][],
  rowIndex: number,
  colIndex: number
): Date | null {
  const row = rows[rowIndex] || []
  const candidates: string[] = []
  for (let c = colIndex + 1; c < Math.min(row.length, colIndex + 15); c++) {
    candidates.push(normalizeCell(row[c]))
  }
  // Also check same row to the left and next row to the right.
  for (let c = Math.max(0, colIndex - 8); c < colIndex; c++) {
    candidates.push(normalizeCell(row[c]))
  }
  const nextRow = rows[rowIndex + 1] || []
  for (let c = colIndex; c < Math.min(nextRow.length, colIndex + 15); c++) {
    candidates.push(normalizeCell(nextRow[c]))
  }
  for (const candidate of candidates) {
    const parsed = parseLooseDate(candidate)
    if (parsed) return parsed
  }
  return null
}

function toNumber(value: unknown): number {
  const num = Number(normalizeCell(value).replace(/,/g, ''))
  return Number.isFinite(num) ? num : 0
}

function detectMatrixSheet(sheet: XLSX.WorkSheet): boolean {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, raw: true })
  const scan = rows.slice(0, 30)
  const hasJobNumber = scan.some((row) =>
    row.some((cell) => normalizeCell(cell).toLowerCase() === 'job number')
  )
  const hasDayHeaders = scan.some((row) => {
    const tokens = row.map((cell) => normalizeCell(cell).toUpperCase())
    return DAY_LABELS.filter((d) => tokens.includes(d)).length >= 3
  })
  return hasJobNumber && hasDayHeaders
}

/**
 * Detects a TRUE side-by-side layout where multiple day+date headers appear
 * in the SAME ROW (e.g. "Sunday 3/15" and "Monday 3/16" side by side).
 */
function detectSheet1Layout(sheet: XLSX.WorkSheet): boolean {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: false,
  })
  // Require at least 2 cells in one row that contain both a day name AND a date
  const DAY_DATE_RE = /(sun|mon|tue|wed|thu|fri|sat)[a-z]*[^0-9]*\d{1,2}[\/\-]\d{1,2}/i
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const count = (rows[r] || []).filter((c) => DAY_DATE_RE.test(String(c || '').trim())).length
    if (count >= 2) return true
  }
  return false
}

/**
 * Detects a vertically-stacked day-section layout (PROJECT LABOR REPORT style) where:
 * - Each day has its own section header row (e.g. "Monday 03/16")
 * - Each section has its own column headers (Start Time, End Time, Job Number)
 * - Data rows follow below the column headers
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
    // Densify to avoid holes from sparse XLSX arrays
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
    // Only count as a true vertical column-header row if there is EXACTLY ONE "Start Time".
    // Two or more "Start Time" columns means a side-by-side layout, not a vertical one.
    const startTimesInRow = normed.filter((v) => v === 'starttime').length
    if (startTimesInRow === 1 && normed.includes('jobnumber')) startTimeRowCount++
  }
  return dayDateRowCount >= 2 && startTimeRowCount >= 2
}

/**
 * Imports from a vertically-stacked day-section layout (PROJECT LABOR REPORT).
 * Scans the sheet row by row, picking up day+date context from section headers,
 * then reading actual clock times from data rows with Start/End Time columns.
 */
async function importVerticalSections(args: {
  sheet: XLSX.WorkSheet
  sheetName: string
  targetUserId: string
  targetUserName: string
  ianaTimeZone: string | null
  timezoneOffsetMinutes: number
  hintYear: number
}): Promise<{ imported: true; response: object } | { imported: false }> {
  const rowsRaw = XLSX.utils.sheet_to_json<(string | number | null)[]>(args.sheet, {
    header: 1,
    raw: true,
  })
  const rowsFmt = XLSX.utils.sheet_to_json<(string | number | null)[]>(args.sheet, {
    header: 1,
    raw: false,
  })
  if (!rowsFmt.length) return { imported: false }

  const DAY_NAMES_RE = /(sun|mon|tue|wed|thu|fri|sat)/i
  const DATE_RE = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/

  const extractDate = (val: unknown): Date | null => {
    if (val == null) return null
    const str = String(val).trim()
    if (!str) return null
    const dm = str.match(DATE_RE)
    if (!dm) return null
    const month = Number(dm[1]) - 1
    const day = Number(dm[2])
    let year = args.hintYear
    if (dm[3]) {
      year = Number(dm[3])
      if (year < 100) year += 2000
    }
    const d = new Date(year, month, day, 12, 0, 0, 0)
    return !isNaN(d.getTime()) && d.getFullYear() >= 2000 ? d : null
  }

  // Convert Excel time fraction (0–1) or "HH:MM [AM/PM]" string to { h, m }
  const toHM = (raw: unknown, fmt: unknown): { h: number; m: number } | null => {
    const rawNum = Number(raw)
    if (Number.isFinite(rawNum) && rawNum > 0 && rawNum < 1) {
      const totalMin = Math.round(rawNum * 24 * 60)
      return { h: Math.floor(totalMin / 60), m: totalMin % 60 }
    }
    const str = String(fmt ?? raw ?? '').trim()
    if (!str) return null
    const m = str.match(/^(\d{1,2}):(\d{2})(?::\d+)?(?:\s*(AM|PM))?$/i)
    if (!m) return null
    let h = Number(m[1])
    const min = Number(m[2])
    const period = (m[3] || '').toUpperCase()
    if (period === 'PM' && h !== 12) h += 12
    else if (period === 'AM' && h === 12) h = 0
    else if (!period && h >= 1 && h <= 6) h += 12 // afternoon heuristic for bare strings
    return { h, m: min }
  }

  const buildLocalDate = (year: number, month: number, day: number, h: number, m: number): Date =>
    wallClockToUtcDate(year, month, day, h, m, args.ianaTimeZone, args.timezoneOffsetMinutes)

  const jobs = await prisma.job.findMany({ select: { id: true, jobNumber: true } })
  const jobsByNormalized = new Map(
    jobs.map((j) => [normalizeJobNumber(j.jobNumber), j.jobNumber] as const)
  )

  let contextDate: Date | null = null
  let startCol = -1
  let endCol = -1
  let jobColV = -1
  let phaseColV = -1
  let weekEnding: Date | null = null

  let inserted = 0
  let skipped = 0
  let ignoredRows = 0
  const errors: Array<{ line: number; reason: string }> = []
  const jobsCreated = { n: 0 }

  for (let r = 0; r < rowsFmt.length; r++) {
    const rawFmtRow = rowsFmt[r] || []
    const rawRow = (rowsRaw[r] || []) as unknown[]
    // Densify the row: XLSX sheet_to_json can return sparse arrays with hole entries
    const maxLen = Math.max((rawFmtRow as any[]).length, rawRow.length)
    const fmtRow: (string | null)[] = Array.from({ length: maxLen }, (_, i) => {
      const v = (rawFmtRow as any[])[i]
      return v != null ? String(v).trim() : ''
    })
    const values = fmtRow.map((c) => (c != null ? String(c).trim() : ''))
    const normed = values.map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ''))

    // --- Check for day+date section header (leftmost occurrence wins) ---
    let foundDayHeader = false
    for (let c = 0; c < values.length && !foundDayHeader; c++) {
      const val = values[c]
      if (!val || !DAY_NAMES_RE.test(val)) continue
      // Look for a date in this cell or up to 4 cells to the right
      let date: Date | null = extractDate(val)
      if (!date) {
        for (let cc = c + 1; cc <= Math.min(values.length - 1, c + 4) && !date; cc++) {
          date = extractDate(values[cc])
        }
      }
      if (date) {
        contextDate = date
        if (!weekEnding || date > weekEnding) weekEnding = date
        foundDayHeader = true
      }
    }
    if (foundDayHeader) continue // Section header rows aren't data rows

    // --- Check for column header row (Start Time + Job Number) ---
    const maybeStart = normed.indexOf('starttime')
    const maybeJob = normed.findIndex((v) => v === 'jobnumber')
    if (maybeStart >= 0 && maybeJob >= 0) {
      startCol = maybeStart
      // Find end/job/phase within the next 10 columns to avoid picking up an admin section
      const slice = normed.slice(startCol, startCol + 10)
      const relEnd = slice.indexOf('endtime')
      const relJob = slice.findIndex((v) => v === 'jobnumber')
      const relPhase = slice.findIndex((v) => v === 'phasecode' || v === 'phase')
      endCol = relEnd >= 0 ? startCol + relEnd : startCol + 1
      jobColV = relJob >= 0 ? startCol + relJob : startCol + 2
      phaseColV = relPhase >= 0 ? startCol + relPhase : startCol + 3
      continue
    }

    // --- Data row ---
    if (startCol < 0 || !contextDate) {
      ignoredRows++
      continue
    }

    const jobVal = values[jobColV] ?? ''
    const phaseVal = values[phaseColV] ?? ''
    if (!jobVal || isLikelyNonDataRow(values)) {
      ignoredRows++
      continue
    }

    const startHM = toHM(rawRow[startCol], fmtRow[startCol])
    if (!startHM) {
      ignoredRows++
      continue
    }

    const endHMRaw = endCol >= 0 ? toHM(rawRow[endCol], fmtRow[endCol]) : null
    // Rule: if end hour < start hour (same 12-hour cycle), end is PM.
    // e.g. start=11, end=1 → end must be 1 PM; start=12, end=2 → 2 PM.
    let endHM = endHMRaw
    if (startHM && endHMRaw && endHMRaw.h < startHM.h && endHMRaw.h >= 1 && endHMRaw.h <= 12) {
      endHM = { h: endHMRaw.h + 12, m: endHMRaw.m }
    }

    if (!endHM) {
      ignoredRows++
      continue
    }

    const parsedJob = splitJobAndPhaseFromCell(jobVal, phaseVal)
    if (!parsedJob.jobNumber) {
      ignoredRows++
      continue
    }

    const startAt = buildLocalDate(
      contextDate.getFullYear(),
      contextDate.getMonth(),
      contextDate.getDate(),
      startHM.h,
      startHM.m
    )
    const endAt = buildLocalDate(
      contextDate.getFullYear(),
      contextDate.getMonth(),
      contextDate.getDate(),
      endHM.h,
      endHM.m
    )
    if (endAt.getTime() <= startAt.getTime()) endAt.setDate(endAt.getDate() + 1)
    if (endAt.getTime() <= startAt.getTime()) {
      ignoredRows++
      continue
    }

    const jobNumber = await ensureJobForImport(
      parsedJob.jobNumber,
      args.targetUserId,
      jobsByNormalized,
      jobsCreated
    )

    const dayStart = buildLocalDate(
      contextDate.getFullYear(),
      contextDate.getMonth(),
      contextDate.getDate(),
      0,
      0
    )
    const dayEnd = buildLocalDate(
      contextDate.getFullYear(),
      contextDate.getMonth(),
      contextDate.getDate(),
      23,
      59
    )
    dayEnd.setSeconds(59, 999)

    let timesheet = await prisma.timesheet.findFirst({
      where: {
        userId: args.targetUserId,
        date: { gte: dayStart, lte: dayEnd },
        clockOutTime: null,
      },
      orderBy: { createdAt: 'asc' },
    })
    if (!timesheet) {
      const midnight = buildLocalDate(
        contextDate.getFullYear(),
        contextDate.getMonth(),
        contextDate.getDate(),
        0,
        0
      )
      timesheet = await prisma.timesheet.create({
        data: {
          userId: args.targetUserId,
          date: buildLocalDate(
            contextDate.getFullYear(),
            contextDate.getMonth(),
            contextDate.getDate(),
            12,
            0
          ),
          clockInTime: midnight,
          clockOutTime: null,
          status: 'in-progress',
        },
      })
    }

    const duplicate = await prisma.jobEntry.findFirst({
      where: {
        timesheet: { userId: args.targetUserId, date: { gte: dayStart, lte: dayEnd } },
        jobNumber,
        laborCode: parsedJob.phaseCode || '',
        punchInTime: startAt,
      },
      select: { id: true },
    })
    if (duplicate) {
      skipped++
      continue
    }

    try {
      await prisma.jobEntry.create({
        data: {
          timesheetId: timesheet.id,
          jobNumber,
          laborCode: parsedJob.phaseCode || '',
          punchInTime: startAt,
          punchOutTime: endAt,
          notes: null,
        },
      })
      inserted++
    } catch (e: any) {
      errors.push({ line: r + 1, reason: e.message || 'Insert failed' })
    }
  }

  if (inserted === 0 && skipped === 0) return { imported: false }

  const reasonCounts: Record<string, number> = {}
  for (const err of errors) reasonCounts[err.reason] = (reasonCounts[err.reason] || 0) + 1
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))

  return {
    imported: true as const,
    response: {
      success: true,
      data: {
        targetUserId: args.targetUserId,
        targetUserName: args.targetUserName,
        sourceSheet: args.sheetName,
        weekEnding: (weekEnding ?? new Date()).toISOString(),
        rowsParsed: inserted + skipped + errors.length + ignoredRows,
        ignoredRows,
        inserted,
        skippedDuplicates: skipped,
        rejected: errors.length,
        errors: errors.slice(0, 200),
        topReasons,
        jobsCreated: jobsCreated.n,
      },
    },
  }
}

/**
 * Imports from the PROJECT LABOR REPORT side-by-side layout.
 * Each day section sits horizontally with its own Start Time / End Time / Job Number columns.
 * Actual clock times are read directly from Excel time fractions.
 */
async function importSheet1Layout(args: {
  sheet: XLSX.WorkSheet
  sheetName: string
  targetUserId: string
  targetUserName: string
  ianaTimeZone: string | null
  timezoneOffsetMinutes: number
  hintYear: number
}): Promise<{ imported: true; response: object } | { imported: false }> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(args.sheet, { header: 1, raw: true, defval: '' })
  const rowsFmt = XLSX.utils.sheet_to_json<unknown[]>(args.sheet, { header: 1, raw: false, defval: '' })

  const DAY_NAMES_RE = /(sun|mon|tue|wed|thu|fri|sat)/i
  // DATE_RE: optional year component
  const DATE_RE = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/

  // Parse a day+date cell (or scan up to 4 adjacent cells) and return the date.
  // Uses the hintYear from importWeekStart when no year is present in the cell.
  const extractSectionDate = (row: unknown[], c: number): Date | null => {
    for (let cc = c; cc <= Math.min(row.length - 1, c + 4); cc++) {
      const val = String((row as any[])[cc] ?? '').trim()
      const dm = val.match(DATE_RE)
      if (dm) {
        const month = Number(dm[1]) - 1
        const day = Number(dm[2])
        let year = args.hintYear
        if (dm[3]) {
          year = Number(dm[3])
          if (year < 100) year += 2000
        }
        const d = new Date(year, month, day, 12, 0, 0, 0)
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) return d
      }
    }
    return null
  }

  // Convert raw Excel value + formatted string to { h, m }.
  // hasExplicitPeriod: true only when AM/PM appears in the formatted string,
  // so Excel fractions without AM/PM can still be corrected by the PM heuristic.
  const toTimeHM = (
    raw: unknown,
    fmt: unknown
  ): { h: number; m: number; hasExplicitPeriod: boolean } | null => {
    const fmtStr = String(fmt ?? '').trim()
    const hasExplicitPeriod = /AM|PM/i.test(fmtStr)
    const rawNum = Number(raw)
    if (Number.isFinite(rawNum) && rawNum > 0 && rawNum < 1) {
      // Excel time fraction – always gives the exact stored time
      const totalMin = Math.round(rawNum * 24 * 60)
      const h = Math.floor(totalMin / 60)
      const m = totalMin % 60
      // Only mark explicit if the formatted cell actually displays AM or PM
      return { h, m, hasExplicitPeriod }
    }
    const str = fmtStr || String(raw ?? '').trim()
    if (!str) return null
    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d+)?(?:\s*(AM|PM))?$/i)
    if (!match) return null
    let h = Number(match[1])
    const min = Number(match[2])
    const period = (match[3] || '').toUpperCase()
    if (period === 'PM' && h !== 12) h += 12
    else if (period === 'AM' && h === 12) h = 0
    else if (!period && h >= 1 && h <= 6) h += 12 // afternoon heuristic for bare times
    return { h, m: min, hasExplicitPeriod: period === 'AM' || period === 'PM' }
  }

  const buildLocalDate = (year: number, month: number, day: number, h: number, m: number): Date =>
    wallClockToUtcDate(year, month, day, h, m, args.ianaTimeZone, args.timezoneOffsetMinutes)

  const jobs = await prisma.job.findMany({ select: { id: true, jobNumber: true } })
  const jobsByNormalized = new Map(
    jobs.map((j) => [normalizeJobNumber(j.jobNumber), j.jobNumber] as const)
  )

  let inserted = 0
  let skipped = 0
  let ignoredRows = 0
  const errors: Array<{ line: number; reason: string }> = []
  const jobsCreated = { n: 0 }
  let weekEnding: Date | null = null

  // Section state: resets at each day-header row
  let sectionDayDates = new Map<number, Date>() // colIndex -> date for this section
  let sectionStartCols: number[] = []
  let sectionEndCols: number[] = []
  let sectionJobCols: number[] = []
  let sectionPhaseCols: number[] = []
  let inSection = false

  for (let r = 0; r < rows.length; r++) {
    const rawRow = (rows[r] as any[]) || []
    const fmtRow = (rowsFmt[r] as any[]) || []
    const normed = fmtRow.map((c: unknown) =>
      String(c ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
    )

    // --- Detect section-divider row: any row with day+date cells AND no time/job columns ---
    // (The "no time/job" guard prevents data rows from being misread as section headers.)
    const rowHasTimeOrJob =
      normed.some((v: string) => v === 'starttime' || v === 'endtime') ||
      normed.some((v: string) => v === 'jobnumber')
    let sectionDateCount = 0
    const newSectionDates = new Map<number, Date>()
    if (!rowHasTimeOrJob) {
      for (let c = 0; c < fmtRow.length; c++) {
        const val = String(fmtRow[c] ?? '').trim()
        if (!val || !DAY_NAMES_RE.test(val)) continue
        const d = extractSectionDate(fmtRow, c)
        if (d) {
          newSectionDates.set(c, d)
          sectionDateCount++
          if (!weekEnding || d > weekEnding) weekEnding = d
        }
      }
    }
    if (sectionDateCount >= 1) {
      // Start a new section: reset column layout and store this row's day dates.
      sectionDayDates = newSectionDates
      sectionStartCols = []
      sectionEndCols = []
      sectionJobCols = []
      sectionPhaseCols = []
      inSection = true
      continue
    }

    // --- Detect column-header row: 1+ "Start Time" + "Job Number" cells ---
    const sCols = normed.reduce(
      (acc: number[], v: string, i: number) => (v === 'starttime' ? [...acc, i] : acc),
      []
    )
    if (sCols.length >= 1 && normed.some((v: string) => v === 'jobnumber')) {
      sectionStartCols = sCols
      sectionEndCols = normed.reduce(
        (acc: number[], v: string, i: number) => (v === 'endtime' ? [...acc, i] : acc),
        []
      )
      sectionJobCols = normed.reduce(
        (acc: number[], v: string, i: number) => (v === 'jobnumber' ? [...acc, i] : acc),
        []
      )
      sectionPhaseCols = normed.reduce(
        (acc: number[], v: string, i: number) =>
          v === 'phasecode' || v === 'phase' ? [...acc, i] : acc,
        []
      )
      continue
    }

    if (!inSection || sectionStartCols.length === 0 || sectionDayDates.size === 0) {
      ignoredRows++
      continue
    }

    // --- Data row: process each column group ---
    for (let g = 0; g < sectionStartCols.length; g++) {
      const startCol = sectionStartCols[g]
      const endCol = sectionEndCols[g] !== undefined ? sectionEndCols[g] : startCol + 1
      const jobColG = sectionJobCols[g] !== undefined ? sectionJobCols[g] : startCol + 2
      const phaseColG = sectionPhaseCols[g] !== undefined ? sectionPhaseCols[g] : startCol + 3

      // Find the nearest day date at or to the left of this startCol
      const contextDate =
        [...sectionDayDates.entries()]
          .filter(([c]) => c <= startCol)
          .sort(([a], [b]) => b - a)[0]?.[1] ?? null
      if (!contextDate) continue

      const jobVal = String(fmtRow[jobColG] ?? '').trim()
      const phaseVal = String(fmtRow[phaseColG] ?? '').trim()

      if (!jobVal || isLikelyNonDataRow(fmtRow.map((c: unknown) => String(c ?? '')))) {
        ignoredRows++
        continue
      }

      const startHM = toTimeHM(rawRow[startCol], fmtRow[startCol])
      const endHMRaw = toTimeHM(rawRow[endCol], fmtRow[endCol])

      // PM correction: if end appears before start and no AM/PM is explicit, it's PM.
      // e.g. start=11:00, end=1:00 → end is 1 PM (add 12).
      let endHM = endHMRaw
      if (startHM && endHMRaw && !endHMRaw.hasExplicitPeriod) {
        if (endHMRaw.h < startHM.h && endHMRaw.h >= 1 && endHMRaw.h <= 12) {
          endHM = { ...endHMRaw, h: endHMRaw.h + 12 }
        }
      }

      if (!startHM) {
        ignoredRows++
        continue
      }

      const parsedJob = splitJobAndPhaseFromCell(jobVal, phaseVal)
      if (!parsedJob.jobNumber || isLikelyNonDataRow([jobVal])) {
        ignoredRows++
        continue
      }

      const startAt = buildLocalDate(
        contextDate.getFullYear(),
        contextDate.getMonth(),
        contextDate.getDate(),
        startHM.h,
        startHM.m
      )
      let endAt: Date | null = null
      if (endHM) {
        endAt = buildLocalDate(
          contextDate.getFullYear(),
          contextDate.getMonth(),
          contextDate.getDate(),
          endHM.h,
          endHM.m
        )
        if (endAt.getTime() <= startAt.getTime()) endAt.setDate(endAt.getDate() + 1)
      }

      if (!endAt || endAt.getTime() <= startAt.getTime()) {
        ignoredRows++
        continue
      }

      const jobNumber = await ensureJobForImport(
        parsedJob.jobNumber,
        args.targetUserId,
        jobsByNormalized,
        jobsCreated
      )

      const dayStart = buildLocalDate(
        contextDate.getFullYear(),
        contextDate.getMonth(),
        contextDate.getDate(),
        0,
        0
      )
      const dayEnd = buildLocalDate(
        contextDate.getFullYear(),
        contextDate.getMonth(),
        contextDate.getDate(),
        23,
        59
      )
      dayEnd.setSeconds(59, 999)

      let timesheet = await prisma.timesheet.findFirst({
        where: {
          userId: args.targetUserId,
          date: { gte: dayStart, lte: dayEnd },
          clockOutTime: null,
        },
        orderBy: { createdAt: 'asc' },
      })
      if (!timesheet) {
        timesheet = await prisma.timesheet.create({
          data: {
            userId: args.targetUserId,
            date: buildLocalDate(
              contextDate.getFullYear(),
              contextDate.getMonth(),
              contextDate.getDate(),
              12,
              0
            ),
            clockInTime: buildLocalDate(
              contextDate.getFullYear(),
              contextDate.getMonth(),
              contextDate.getDate(),
              0,
              0
            ),
            clockOutTime: null,
            status: 'in-progress',
          },
        })
      }

      const duplicate = await prisma.jobEntry.findFirst({
        where: {
          timesheet: { userId: args.targetUserId, date: { gte: dayStart, lte: dayEnd } },
          jobNumber,
          laborCode: parsedJob.phaseCode || '',
          punchInTime: startAt,
        },
        select: { id: true },
      })
      if (duplicate) {
        skipped++
        continue
      }

      try {
        await prisma.jobEntry.create({
          data: {
            timesheetId: timesheet.id,
            jobNumber,
            laborCode: parsedJob.phaseCode || '',
            punchInTime: startAt,
            punchOutTime: endAt,
            notes: null,
          },
        })
        inserted++
      } catch (e: any) {
        errors.push({ line: r + 1, reason: e.message || 'Insert failed' })
      }
    }
  }

  const reasonCounts: Record<string, number> = {}
  for (const err of errors) reasonCounts[err.reason] = (reasonCounts[err.reason] || 0) + 1
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))

  return {
    imported: true as const,
    response: {
      success: true,
      data: {
        targetUserId: args.targetUserId,
        targetUserName: args.targetUserName,
        sourceSheet: args.sheetName,
        weekEnding: (weekEnding ?? new Date()).toISOString(),
        rowsParsed: inserted + skipped + errors.length + ignoredRows,
        ignoredRows,
        inserted,
        skippedDuplicates: skipped,
        rejected: errors.length,
        errors: errors.slice(0, 200),
        topReasons,
        jobsCreated: jobsCreated.n,
      },
    },
  }
}

async function importMatrixSheet(args: {
  sheet: XLSX.WorkSheet
  sheetName: string
  targetUserId: string
  targetUserName: string
  ianaTimeZone: string | null
  timezoneOffsetMinutes: number
}) {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(args.sheet, { header: 1, raw: true })
  if (!rows.length) {
    return { imported: false as const }
  }

  let jobHeaderRow = -1
  let weekEnding: Date | null = null
  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const row = rows[r] || []
    for (let c = 0; c < row.length; c++) {
      const text = normalizeCell(row[c]).toLowerCase()
      if (text === 'job number') jobHeaderRow = r
    }
  }

  if (jobHeaderRow < 0) {
    return { imported: false as const }
  }

  // Prefer "Week Ending" cells closest to the job header block.
  const localStart = Math.max(0, jobHeaderRow - 20)
  const localEnd = Math.min(rows.length - 1, jobHeaderRow + 20)
  for (let r = localStart; r <= localEnd && !weekEnding; r++) {
    const row = rows[r] || []
    for (let c = 0; c < row.length; c++) {
      const text = normalizeCell(row[c]).toLowerCase()
      if (!text.includes('week ending')) continue
      weekEnding = extractDateFromNearbyCells(rows, r, c)
      if (weekEnding) break
    }
  }

  // Fallback scan entire sheet (first match only).
  if (!weekEnding) {
    for (let r = 0; r < Math.min(rows.length, 120) && !weekEnding; r++) {
      const row = rows[r] || []
      for (let c = 0; c < row.length; c++) {
        const text = normalizeCell(row[c]).toLowerCase()
        if (!text.includes('week ending')) continue
        weekEnding = extractDateFromNearbyCells(rows, r, c)
        if (weekEnding) break
      }
    }
  }

  const subHeaderRow = rows[jobHeaderRow + 1] || []
  const dayMap = new Map<
    (typeof DAY_LABELS)[number],
    { regularIdx: number; overtimeIdx: number }
  >()
  const header = rows[jobHeaderRow] || []
  const jobCol = header.findIndex((cell) => normalizeCell(cell).toLowerCase() === 'job number')
  const phaseCol = header.findIndex((cell) => {
    const v = normalizeCell(cell).toLowerCase().replace(/[^a-z0-9]/g, '')
    return v === 'phasecode' || v === 'phase'
  })
  const weekTotalCol = header.findIndex((cell) => normalizeCell(cell).toUpperCase().includes('WEEKLY TOTAL'))
  const scanStart = jobCol >= 0 ? jobCol : 0
  const scanEnd = weekTotalCol > scanStart ? weekTotalCol : header.length

  const dayCols: Array<{ day: (typeof DAY_LABELS)[number]; col: number }> = []
  for (let c = scanStart; c < scanEnd; c++) {
    const dayToken = normalizeCell(header[c]).toUpperCase() as (typeof DAY_LABELS)[number]
    if (DAY_LABELS.includes(dayToken)) {
      dayCols.push({ day: dayToken, col: c })
    }
  }

  for (let i = 0; i < dayCols.length; i++) {
    const dayToken = dayCols[i].day
    const c = dayCols[i].col
    const nextCol = i + 1 < dayCols.length ? dayCols[i + 1].col : scanEnd

    let regularIdx = -1
    let overtimeIdx = -1
    for (let k = c; k < nextCol && k < subHeaderRow.length; k++) {
      const sub = normalizeCell(subHeaderRow[k]).toLowerCase()
      if (sub === 'regular') regularIdx = k
      if (sub.includes('over')) overtimeIdx = k
    }
    if (regularIdx >= 0 || overtimeIdx >= 0) {
      dayMap.set(dayToken, { regularIdx, overtimeIdx })
    }
  }

  if (!dayMap.size) {
    return { imported: false as const }
  }

  const buildLocalDate = (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number
  ): Date =>
    wallClockToUtcDate(year, month, day, hour, minute, args.ianaTimeZone, args.timezoneOffsetMinutes)

  const today = new Date()
  if (!weekEnding) {
    // Default to end of current week if missing in sheet.
    const d = new Date(today)
    d.setHours(12, 0, 0, 0)
    const day = d.getDay()
    d.setDate(d.getDate() + (6 - day))
    weekEnding = d
  }
  // Safety guard against malformed parsed dates.
  if (Number.isNaN(weekEnding.getTime()) || weekEnding.getFullYear() < 2000 || weekEnding.getFullYear() > 2100) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    const day = d.getDay()
    d.setDate(d.getDate() + (6 - day))
    weekEnding = d
  }
  weekEnding.setHours(12, 0, 0, 0)
  const sunday = new Date(weekEnding)
  sunday.setDate(weekEnding.getDate() - 6)

  const jobs = await prisma.job.findMany({ select: { id: true, jobNumber: true } })
  const jobsByNormalized = new Map(
    jobs.map((j) => [normalizeJobNumber(j.jobNumber), j.jobNumber] as const)
  )

  let inserted = 0
  let skipped = 0
  let ignoredRows = 0
  const errors: Array<{ line: number; reason: string }> = []
  const jobsCreated = { n: 0 }
  const dayCursorMinutesByDay = new Map<number, number>()
  const jc = jobCol >= 0 ? jobCol : 0
  const pc = phaseCol >= 0 ? phaseCol : jc + 1

  for (let r = jobHeaderRow + 2; r < rows.length; r++) {
    const row = rows[r] || []
    const parsedJob = splitJobAndPhaseFromCell(normalizeCell(row[jc]), normalizeCell(row[pc]))
    const jobRaw = parsedJob.jobNumber
    if (!jobRaw) {
      ignoredRows++
      continue
    }
    if (jobRaw.toLowerCase().includes('total')) {
      ignoredRows++
      continue
    }

    const jobNumber = await ensureJobForImport(jobRaw, args.targetUserId, jobsByNormalized, jobsCreated)
    const phaseCode = parsedJob.phaseCode

    for (let dayIdx = 0; dayIdx < DAY_LABELS.length; dayIdx++) {
      const dayName = DAY_LABELS[dayIdx]
      const map = dayMap.get(dayName)
      if (!map) continue
      const regular = map.regularIdx >= 0 ? toNumber(row[map.regularIdx]) : 0
      const overtime = map.overtimeIdx >= 0 ? toNumber(row[map.overtimeIdx]) : 0
      const totalHours = regular + overtime
      if (totalHours <= 0) continue

      const workDate = new Date(sunday)
      workDate.setDate(sunday.getDate() + dayIdx)
      const workDateLocalNoon = buildLocalDate(
        workDate.getFullYear(),
        workDate.getMonth(),
        workDate.getDate(),
        12,
        0
      )

      const dayStart = buildLocalDate(workDate.getFullYear(), workDate.getMonth(), workDate.getDate(), 0, 0)
      const dayEnd = buildLocalDate(workDate.getFullYear(), workDate.getMonth(), workDate.getDate(), 23, 59)
      dayEnd.setSeconds(59, 999)

      // Only reuse job-entry container timesheets (no clockOut), never attach to real attendance records
      let timesheet = await prisma.timesheet.findFirst({
        where: {
          userId: args.targetUserId,
          date: { gte: dayStart, lte: dayEnd },
          clockOutTime: null,
        },
        orderBy: { createdAt: 'asc' },
      })
      if (!timesheet) {
        const midnight = buildLocalDate(workDate.getFullYear(), workDate.getMonth(), workDate.getDate(), 0, 0)
        timesheet = await prisma.timesheet.create({
          data: {
            userId: args.targetUserId,
            date: workDateLocalNoon,
            clockInTime: midnight,
            clockOutTime: null,
            status: 'in-progress',
          },
        })
      }

      const nextCursorMin = dayCursorMinutesByDay.get(dayIdx) ?? (8 * 60)
      const startH = Math.floor(nextCursorMin / 60)
      const startM = nextCursorMin % 60
      const start = buildLocalDate(
        workDate.getFullYear(),
        workDate.getMonth(),
        workDate.getDate(),
        startH,
        startM
      )
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + Math.round(totalHours * 60))
      dayCursorMinutesByDay.set(dayIdx, nextCursorMin + Math.round(totalHours * 60))

      const duplicate = await prisma.jobEntry.findFirst({
        where: {
          timesheet: { userId: args.targetUserId, date: { gte: dayStart, lte: dayEnd } },
          jobNumber,
          laborCode: phaseCode || '',
          punchInTime: start,
          punchOutTime: end,
        },
        select: { id: true },
      })
      if (duplicate) {
        skipped++
        continue
      }

      try {
        await prisma.jobEntry.create({
          data: {
            timesheetId: timesheet.id,
            jobNumber,
            laborCode: phaseCode || '',
            punchInTime: start,
            punchOutTime: end,
            notes: 'Imported from weekly matrix',
          },
        })
        inserted++
      } catch (error: any) {
        errors.push({ line: r + 1, reason: error.message || 'Failed to insert row' })
      }
    }
  }

  const reasonCounts: Record<string, number> = {}
  for (const err of errors) reasonCounts[err.reason] = (reasonCounts[err.reason] || 0) + 1
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))

  return {
    imported: true as const,
    response: {
      success: true,
      data: {
        targetUserId: args.targetUserId,
        targetUserName: args.targetUserName,
        sourceSheet: args.sheetName,
        weekEnding: weekEnding.toISOString(),
        rowsParsed: inserted + skipped + errors.length,
        ignoredRows,
        inserted,
        skippedDuplicates: skipped,
        rejected: errors.length,
        errors: errors.slice(0, 200),
        topReasons,
        jobsCreated: jobsCreated.n,
      },
    },
  }
}

function excelSerialToDate(value: number): Date {
  const excelEpochUtcMs = Date.UTC(1899, 11, 30)
  return new Date(excelEpochUtcMs + value * 24 * 60 * 60 * 1000)
}

function normalizeJobNumber(value: string): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  const withoutQuotes = trimmed.replace(/^"+|"+$/g, '')
  const noWhitespace = withoutQuotes.replace(/\s+/g, '')
  // Common Excel artifact for numeric-like IDs exported as text
  return noWhitespace.replace(/\.0+$/, '')
}

/** If the job number is not in the map, create a minimal Job row so imports never depend on pre-seeded jobs. */
async function ensureJobForImport(
  rawJobNumber: string,
  createdById: string,
  jobsByNormalized: Map<string, string>,
  jobsCreated: { n: number }
): Promise<string> {
  const lookupKey = normalizeJobNumber(rawJobNumber)
  if (!lookupKey) return rawJobNumber.trim()
  const existing = jobsByNormalized.get(lookupKey)
  if (existing) return existing

  const base =
    rawJobNumber
      .trim()
      .replace(/^"+|"+$/g, '')
      .replace(/\.0+$/, '') || `IMP-${Date.now()}`
  let jobNumber = base
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      const created = await prisma.job.create({
        data: {
          jobNumber,
          title: `Imported — ${jobNumber}`,
          createdById,
        },
      })
      jobsByNormalized.set(normalizeJobNumber(created.jobNumber), created.jobNumber)
      jobsCreated.n++
      return created.jobNumber
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === 'P2002') {
        jobNumber = `${base}-${attempt + 1}`
        continue
      }
      throw e
    }
  }
  throw new Error(`Could not create job for ${base}`)
}

function splitJobAndPhaseFromCell(jobCell: string, phaseCell: string): { jobNumber: string; phaseCode: string } {
  const rawJob = (jobCell || '').trim().replace(/^"+|"+$/g, '')
  const rawPhase = (phaseCell || '').trim().replace(/^"+|"+$/g, '')
  if (!rawJob) return { jobNumber: '', phaseCode: rawPhase }

  const tokens = rawJob.split(/\s+/).filter(Boolean)
  if (tokens.length > 1 && rawPhase) {
    const last = tokens[tokens.length - 1]
    if (last.toUpperCase() === rawPhase.toUpperCase()) {
      return {
        jobNumber: tokens.slice(0, -1).join(' ').replace(/\.0+$/, ''),
        phaseCode: rawPhase,
      }
    }
  }

  // If phase code column is empty, infer a trailing 2-letter phase suffix.
  // Examples: "E3948 CD" -> job "E3948", phase "CD", "E3973CD" -> "E3973" + "CD".
  if (!rawPhase) {
    const spacedMatch = rawJob.match(/^(.+?)\s+([A-Za-z]{2})$/)
    if (spacedMatch && /\d/.test(spacedMatch[1])) {
      return {
        jobNumber: spacedMatch[1].replace(/\s+/g, '').replace(/\.0+$/, ''),
        phaseCode: spacedMatch[2].toUpperCase(),
      }
    }
    const compactMatch = rawJob.match(/^(.+?)([A-Za-z]{2})$/)
    if (compactMatch && /\d/.test(compactMatch[1])) {
      return {
        jobNumber: compactMatch[1].replace(/\s+/g, '').replace(/\.0+$/, ''),
        phaseCode: compactMatch[2].toUpperCase(),
      }
    }
  }

  return {
    jobNumber: rawJob.replace(/\.0+$/, ''),
    phaseCode: rawPhase,
  }
}

function detectDelimiter(lines: string[]): ',' | ';' | '\t' {
  const candidates: Array<',' | ';' | '\t'> = [',', ';', '\t']
  const sample = lines.slice(0, Math.min(lines.length, 25))
  let best: ',' | ';' | '\t' = ','
  let bestScore = -1

  for (const delimiter of candidates) {
    const score = sample.reduce((sum, line) => {
      let inQuotes = false
      let count = 0
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (ch === delimiter && !inQuotes) {
          count++
        }
      }
      return sum + count
    }, 0)
    if (score > bestScore) {
      best = delimiter
      bestScore = score
    }
  }

  return bestScore > 0 ? best : ','
}

function splitDelimitedLine(line: string, delimiter: ',' | ';' | '\t'): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  out.push(current.trim())
  return out
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function headerIndex(headers: string[], keys: string[]): number {
  const normalized = headers.map(normalizeHeader)
  for (const key of keys) {
    const idx = normalized.findIndex((header) => {
      if (header === key) return true
      // Allow loose matching for longer aliases (but avoid broad matches for tiny keys like "in"/"out")
      return key.length >= 4 && header.includes(key)
    })
    if (idx >= 0) return idx
  }
  return -1
}

function parseDateAndTime(
  dateValue: string,
  timeValue: string,
  ianaTimeZone: string | null,
  fallbackOffsetMinutes: number
): Date | null {
  const dateRaw = dateValue?.trim()
  const timeRaw = timeValue?.trim()
  if (!dateRaw || !timeRaw) return null

  const dateNum = Number(dateRaw)
  const date = Number.isFinite(dateNum) ? excelSerialToDate(dateNum) : new Date(dateRaw)
  if (Number.isNaN(date.getTime())) return null

  const y = date.getFullYear()
  const mo = date.getMonth()
  const d = date.getDate()

  const timeNum = Number(timeRaw)
  if (Number.isFinite(timeNum) && timeNum > 0 && timeNum < 1) {
    const totalMin = Math.round(timeNum * 24 * 60)
    const h = Math.floor(totalMin / 60)
    const min = totalMin % 60
    return wallClockToUtcDate(y, mo, d, h, min, ianaTimeZone, fallbackOffsetMinutes)
  }
  if (Number.isFinite(timeNum) && timeNum >= 1) {
    const timeDate = excelSerialToDate(timeNum)
    const h = timeDate.getUTCHours()
    const min = timeDate.getUTCMinutes()
    return wallClockToUtcDate(y, mo, d, h, min, ianaTimeZone, fallbackOffsetMinutes)
  }

  const trimmed = timeRaw.toUpperCase()
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))$/)
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/)

  let hours = 0
  let minutes = 0
  if (match12) {
    hours = Number(match12[1]) % 12
    minutes = Number(match12[2])
    if (match12[3] === 'PM') hours += 12
  } else if (match24) {
    hours = Number(match24[1])
    minutes = Number(match24[2])
    if (hours >= 1 && hours <= 6) {
      hours += 12
    }
  } else {
    return null
  }

  return wallClockToUtcDate(y, mo, d, hours, minutes, ianaTimeZone, fallbackOffsetMinutes)
}

function parseDateTimeFlexible(
  value: string,
  ianaTimeZone: string | null,
  fallbackOffsetMinutes: number
): Date | null {
  const raw = value?.trim()
  if (!raw) return null
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) {
    const asExcel = excelSerialToDate(numeric)
    if (!Number.isNaN(asExcel.getTime())) return asExcel
  }
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed

  const match = raw.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i
  )
  if (!match) return null
  const month = Number(match[1]) - 1
  const day = Number(match[2])
  let year = Number(match[3])
  if (year < 100) year += 2000
  let hour = Number(match[4])
  const minute = Number(match[5])
  const meridiem = (match[6] || '').toUpperCase()
  if (meridiem) {
    hour = hour % 12
    if (meridiem === 'PM') hour += 12
  }
  return wallClockToUtcDate(year, month, day, hour, minute, ianaTimeZone, fallbackOffsetMinutes)
}

function findHeaderLine(lines: string[], delimiter: ',' | ';' | '\t'): { index: number; headers: string[] } {
  const scanLimit = Math.min(lines.length, 100)
  for (let i = 0; i < scanLimit; i++) {
    const headers = splitDelimitedLine(lines[i], delimiter)
    const hasJob =
      headerIndex(headers, [
        'jobnumber',
        'jobcode',
        'job',
        'jobno',
        'jobnum',
        'jobid',
        'jobname',
        'project',
        'projectnumber',
        'workorder',
        'workordernumber',
        'workorderno',
      ]) >= 0
    const hasStart =
      headerIndex(headers, [
        'starttime',
        'clockin',
        'punchin',
        'timein',
        'start',
        'indatetime',
        'startdatetime',
        'clockindatetime',
        'startdateandtime',
        'intime',
      ]) >= 0
    const hasEnd =
      headerIndex(headers, [
        'endtime',
        'clockout',
        'punchout',
        'timeout',
        'end',
        'outdatetime',
        'enddatetime',
        'clockoutdatetime',
        'enddateandtime',
        'outtime',
      ]) >= 0
    if (hasJob && hasStart && hasEnd) {
      return { index: i, headers }
    }
  }
  return { index: 0, headers: splitDelimitedLine(lines[0], delimiter) }
}

function sheetHeaderScore(lines: string[]): { score: number; delimiter: ',' | ';' | '\t'; headerIndex: number } {
  if (!lines.length) return { score: -1, delimiter: ',', headerIndex: -1 }
  const delimiter = detectDelimiter(lines)
  const scanLimit = Math.min(lines.length, 100)
  for (let i = 0; i < scanLimit; i++) {
    const headers = splitDelimitedLine(lines[i], delimiter)
    const jobIdx = headerIndex(headers, [
      'jobnumber',
      'jobcode',
      'job',
      'jobno',
      'jobnum',
      'jobid',
      'jobname',
      'project',
      'projectnumber',
      'workorder',
      'workordernumber',
      'workorderno',
    ])
    const startIdx = headerIndex(headers, [
      'starttime',
      'clockin',
      'punchin',
      'timein',
      'start',
      'in',
      'startdatetime',
      'clockindatetime',
      'startdateandtime',
      'indatetime',
      'intime',
    ])
    const endIdx = headerIndex(headers, [
      'endtime',
      'clockout',
      'punchout',
      'timeout',
      'end',
      'out',
      'enddatetime',
      'clockoutdatetime',
      'enddateandtime',
      'outdatetime',
      'outtime',
    ])
    if (jobIdx >= 0 && startIdx >= 0 && endIdx >= 0) {
      // Prefer headers found earlier in sheet and with more rows below.
      const rowsBelow = Math.max(0, lines.length - i - 1)
      return { score: 1000 + rowsBelow - i, delimiter, headerIndex: i }
    }
  }
  return { score: -1, delimiter, headerIndex: -1 }
}

function timesheetDateNoon(dateInput: Date): Date {
  return new Date(
    dateInput.getFullYear(),
    dateInput.getMonth(),
    dateInput.getDate(),
    12,
    0,
    0,
    0
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const selectedUserId = String(form.get('userId') || session.user.id)
    const timezoneOffsetMinutes = Number(form.get('timezoneOffsetMinutes') ?? 0)
    const timeZoneRaw = String(form.get('timeZone') ?? '').trim()
    const ianaTimeZone = timeZoneRaw.length > 0 ? timeZoneRaw : null
    const importWeekStartRaw = String(form.get('importWeekStart') || '')
    const importWeekEndRaw = String(form.get('importWeekEnd') || '')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'CSV file is required' }, { status: 400 })
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    })
    if (!actor) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const isPrivileged = actor.role === 'ADMIN' || actor.role === 'MANAGER'
    if (!isPrivileged && selectedUserId !== actor.id) {
      return NextResponse.json(
        { success: false, error: 'You can only import for yourself' },
        { status: 403 }
      )
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: selectedUserId },
      select: { id: true, name: true, email: true },
    })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Selected user not found' }, { status: 404 })
    }

    const fileName = (file as File).name?.toLowerCase() || ''
    const isExcelFile =
      fileName.endsWith('.xls') || fileName.endsWith('.xlsx') || fileName.endsWith('.xlsm')

    // For Excel imports, clear existing job entries in the selected week first.
    if (isExcelFile && importWeekStartRaw && importWeekEndRaw) {
      const weekStart = new Date(importWeekStartRaw)
      const weekEnd = new Date(importWeekEndRaw)
      if (!Number.isNaN(weekStart.getTime()) && !Number.isNaN(weekEnd.getTime())) {
        // Expand by one day buffer to cover timezone-shifted rows.
        const clearStart = new Date(weekStart)
        clearStart.setDate(clearStart.getDate() - 1)
        const clearEnd = new Date(weekEnd)
        clearEnd.setDate(clearEnd.getDate() + 1)
        await prisma.jobEntry.deleteMany({
          where: {
            timesheet: { userId: selectedUserId },
            OR: [
              { punchInTime: { gte: clearStart, lte: clearEnd } },
              { timesheet: { date: { gte: clearStart, lte: clearEnd } } },
            ],
          },
        })
      }
    }

    let text = ''
    let selectedSheetName: string | null = null
    let excelWorkbook: XLSX.WorkBook | null = null
    let detectedMatrixSheetName: string | null = null
    if (isExcelFile) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      excelWorkbook = workbook
      if (!workbook.SheetNames.length) {
        return NextResponse.json(
          { success: false, error: 'Excel file has no sheets to import' },
          { status: 400 }
        )
      }
      let bestText = ''
      let bestScore = -1
      let bestPunchSheetName: string | null = null
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        if (!sheet) continue
        const candidateText = XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n', blankrows: false })
        const candidateLines = candidateText
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .split('\n')
          .filter((l) => l.trim().length > 0)
        const { score } = sheetHeaderScore(candidateLines)
        if (score > bestScore) {
          bestScore = score
          bestText = candidateText
          bestPunchSheetName = sheetName
        }
      }

      if (bestScore > 0 && bestPunchSheetName) {
        const bestSheet = workbook.Sheets[bestPunchSheetName]
        if (bestSheet) {
          const tz = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0
          const weekStartDate = importWeekStartRaw ? new Date(importWeekStartRaw) : null
          const hintYear =
            weekStartDate && !Number.isNaN(weekStartDate.getTime())
              ? weekStartDate.getFullYear()
              : new Date().getFullYear()
          const sheetArgs = {
            sheet: bestSheet,
            sheetName: bestPunchSheetName,
            targetUserId: targetUser.id,
            targetUserName: targetUser.name || targetUser.email || '',
            ianaTimeZone,
            timezoneOffsetMinutes: tz,
            hintYear,
          }
          // Vertical stacking (PROJECT LABOR REPORT): day sections stacked below each other
          const isVS = detectVerticalSections(bestSheet)
          const isS1 = detectSheet1Layout(bestSheet)
          if (isVS) {
            const vsResult = await importVerticalSections(sheetArgs)
            if (vsResult.imported) return NextResponse.json(vsResult.response)
          }
          // True side-by-side: multiple day+date headers in the same row
          if (isS1) {
            const s1Result = await importSheet1Layout(sheetArgs)
            if (s1Result.imported) return NextResponse.json(s1Result.response)
          }
        }
        // Prefer detailed punch-based sheet when available.
        text = bestText
        selectedSheetName = bestPunchSheetName
      }

      detectedMatrixSheetName =
        workbook.SheetNames.find((name) => detectMatrixSheet(workbook.Sheets[name])) || null

      // If no punch-style sheet exists, try matrix-style weekly hours import.
      if (bestScore <= 0) {
        if (detectedMatrixSheetName) {
          const matrixResult = await importMatrixSheet({
            sheet: workbook.Sheets[detectedMatrixSheetName],
            sheetName: detectedMatrixSheetName,
            targetUserId: targetUser.id,
            targetUserName: targetUser.name || targetUser.email || '',
            ianaTimeZone,
            timezoneOffsetMinutes: Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0,
          })
          if (matrixResult.imported) {
            return NextResponse.json(matrixResult.response)
          }
        }
      }

      if (!bestText) {
        // Fallback to first sheet text if nothing scored.
        const fallbackSheet = workbook.Sheets[workbook.SheetNames[0]]
        bestText = XLSX.utils.sheet_to_csv(fallbackSheet, { FS: ',', RS: '\n', blankrows: false })
        selectedSheetName = workbook.SheetNames[0]
      }
      text = bestText
    } else {
      text = await file.text()
    }

    const lines = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((l) => l.trim().length > 0)

    if (lines.length < 2) {
      return NextResponse.json({ success: false, error: 'CSV has no data rows' }, { status: 400 })
    }

    const delimiter = detectDelimiter(lines)
    const headerInfo = findHeaderLine(lines, delimiter)
    const headers = headerInfo.headers
    const dataLines = lines.slice(headerInfo.index + 1)

    const dateIdx = headerIndex(headers, ['date', 'workdate', 'entrydate', 'day'])
    const jobIdx = headerIndex(headers, [
      'jobnumber',
      'jobcode',
      'job',
      'jobno',
      'jobnum',
      'jobid',
      'jobname',
      'project',
      'projectnumber',
      'workorder',
      'workordernumber',
      'workorderno',
    ])
    const laborIdx = headerIndex(headers, ['laborcode', 'labor', 'code', 'laborcodeno'])
    const startIdx = headerIndex(headers, [
      'starttime',
      'clockin',
      'punchin',
      'timein',
      'start',
      'in',
      'startdatetime',
      'clockindatetime',
      'startdateandtime',
      'indatetime',
      'intime',
    ])
    const endIdx = headerIndex(headers, [
      'endtime',
      'clockout',
      'punchout',
      'timeout',
      'end',
      'out',
      'enddatetime',
      'clockoutdatetime',
      'enddateandtime',
      'outdatetime',
      'outtime',
    ])
    const notesIdx = headerIndex(headers, ['notes', 'note', 'description'])

    if (jobIdx < 0 || startIdx < 0 || endIdx < 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Required columns missing. Need at least jobNumber + start/end time columns (date may be embedded in start/end).',
          details: {
            delimiter: delimiter === '\t' ? 'tab' : delimiter,
            detectedHeaders: headers,
            normalizedHeaders: headers.map(normalizeHeader),
            headerRow: headerInfo.index + 1,
          },
        },
        { status: 400 }
      )
    }

    const parsed: ParsedRow[] = []
    const rowErrors: Array<{ line: number; reason: string }> = []
    let ignoredRows = 0
    let carryJobNumber = ''
    let carryDate = ''
    for (let i = 0; i < dataLines.length; i++) {
      const values = splitDelimitedLine(dataLines[i], delimiter)
      const rawDate = dateIdx >= 0 ? (values[dateIdx] || '').trim() : ''
      const rawJobNumber = normalizeJobNumber(values[jobIdx] || '')
      const rawStartTime = (values[startIdx] || '').trim()
      const rawEndTime = (values[endIdx] || '').trim()

      // Ignore non-data rows from spreadsheet exports
      const hasAnyValue = [rawDate, rawJobNumber, rawStartTime, rawEndTime].some(Boolean)
      if (!hasAnyValue && !values.some((v) => v.trim().length > 0)) {
        ignoredRows++
        continue
      }
      if (isLikelyNonDataRow(values)) {
        ignoredRows++
        continue
      }

      if (rawJobNumber) carryJobNumber = rawJobNumber
      if (rawDate) carryDate = rawDate

      const row: ParsedRow = {
        line: i + 1 + headerInfo.index + 1,
        date: rawDate || carryDate,
        jobNumber: rawJobNumber || carryJobNumber,
        laborCode: (laborIdx >= 0 ? values[laborIdx] : '')?.trim() || '',
        startTime: rawStartTime,
        endTime: rawEndTime,
        notes: (notesIdx >= 0 ? values[notesIdx] : '')?.trim() || '',
      }

      if (!row.startTime && !row.endTime) {
        ignoredRows++
        continue
      }
      if (!row.jobNumber || !row.startTime || !row.endTime) {
        rowErrors.push({ line: row.line, reason: 'Missing required fields' })
        continue
      }
      parsed.push(row)
    }

    let inserted = 0
    let skipped = 0
    const applyErrors: Array<{ line: number; reason: string }> = [...rowErrors]
    const jobs = await prisma.job.findMany({ select: { id: true, jobNumber: true } })
    const jobsByNormalizedNumber = new Map(
      jobs.map((job) => [normalizeJobNumber(job.jobNumber), job.jobNumber] as const)
    )
    const jobsCreated = { n: 0 }
    const tz = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0
    const weekFilterStart = importWeekStartRaw ? new Date(importWeekStartRaw) : null
    const weekFilterEnd = importWeekEndRaw ? new Date(importWeekEndRaw) : null
    const hasWeekFilter =
      weekFilterStart &&
      weekFilterEnd &&
      !Number.isNaN(weekFilterStart.getTime()) &&
      !Number.isNaN(weekFilterEnd.getTime())

    for (const row of parsed) {
      const startFromDateTime = parseDateTimeFlexible(row.startTime, ianaTimeZone, tz)
      const endFromDateTime = parseDateTimeFlexible(row.endTime, ianaTimeZone, tz)

      const startAt =
        startFromDateTime ||
        (row.date ? parseDateAndTime(row.date, row.startTime, ianaTimeZone, tz) : null)
      let endAt =
        endFromDateTime ||
        (row.date ? parseDateAndTime(row.date, row.endTime, ianaTimeZone, tz) : null)
      if (!startAt || !endAt) {
        applyErrors.push({ line: row.line, reason: 'Invalid date/time range' })
        continue
      }
      if (endAt <= startAt) {
        // Support overnight shifts where end time is after midnight.
        const rolledEnd = new Date(endAt)
        rolledEnd.setDate(rolledEnd.getDate() + 1)
        if (rolledEnd > startAt) {
          endAt = rolledEnd
        } else {
          applyErrors.push({ line: row.line, reason: 'Invalid date/time range' })
          continue
        }
      }

      if (hasWeekFilter && weekFilterStart && weekFilterEnd) {
        const t = startAt.getTime()
        if (t < weekFilterStart.getTime() || t > weekFilterEnd.getTime()) {
          applyErrors.push({
            line: row.line,
            reason: 'Outside selected week — switch the calendar to the week that matches this file',
          })
          continue
        }
      }

      const day = timesheetDateNoon(startAt)
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      const normalizedImportJobNumber = await ensureJobForImport(
        row.jobNumber,
        targetUser.id,
        jobsByNormalizedNumber,
        jobsCreated
      )

      // Use or create a job-only timesheet bucket for the day/user
      let timesheet = await prisma.timesheet.findFirst({
        where: {
          userId: targetUser.id,
          date: { gte: dayStart, lte: dayEnd },
          clockOutTime: null,
          jobEntries: {
            some: {},
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      if (!timesheet) {
        const midnight = new Date(day)
        midnight.setHours(0, 0, 0, 0)
        timesheet = await prisma.timesheet.create({
          data: {
            userId: targetUser.id,
            date: day,
            clockInTime: midnight,
            clockOutTime: null,
            status: 'in-progress',
          },
        })
      }

      const duplicate = await prisma.jobEntry.findFirst({
        where: {
          timesheet: { userId: targetUser.id, date: { gte: dayStart, lte: dayEnd } },
          jobNumber: normalizedImportJobNumber,
          laborCode: row.laborCode || '',
          punchInTime: startAt,
          punchOutTime: endAt,
        },
        select: { id: true },
      })

      if (duplicate) {
        skipped++
        continue
      }

      try {
        await prisma.jobEntry.create({
          data: {
            timesheetId: timesheet.id,
            jobNumber: normalizedImportJobNumber,
            laborCode: row.laborCode || '',
            punchInTime: startAt,
            punchOutTime: endAt,
            notes: row.notes || null,
          },
        })
        inserted++
      } catch (error: any) {
        applyErrors.push({ line: row.line, reason: error.message || 'Failed to insert row' })
      }
    }

    const reasonCounts: Record<string, number> = {}
    for (const err of applyErrors) {
      reasonCounts[err.reason] = (reasonCounts[err.reason] || 0) + 1
    }
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))

    // Fallback: if punch parser produced no inserts and mostly missing fields,
    // retry with matrix parser for weekly grid-style sheets.
    const missingRequiredCount = reasonCounts['Missing required fields'] || 0
    const shouldRetryMatrix =
      isExcelFile &&
      !!excelWorkbook &&
      !!detectedMatrixSheetName &&
      inserted === 0 &&
      missingRequiredCount > 0

    if (shouldRetryMatrix) {
      const matrixResult = await importMatrixSheet({
        sheet: excelWorkbook!.Sheets[detectedMatrixSheetName!],
        sheetName: detectedMatrixSheetName!,
        targetUserId: targetUser.id,
        targetUserName: targetUser.name || targetUser.email || '',
        ianaTimeZone,
        timezoneOffsetMinutes: Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0,
      })
      if (matrixResult.imported) {
        return NextResponse.json(matrixResult.response)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        targetUserId: targetUser.id,
        targetUserName: targetUser.name || targetUser.email,
        sourceSheet: selectedSheetName,
        rowsParsed: parsed.length,
        ignoredRows,
        inserted,
        skippedDuplicates: skipped,
        rejected: applyErrors.length,
        errors: applyErrors.slice(0, 200),
        topReasons,
        jobsCreated: jobsCreated.n,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'CSV import failed' },
      { status: 500 }
    )
  }
}

