export type CsvRow = Record<string, string | number | boolean | null | undefined>

function escapeCsvValue(v: string) {
  // RFC4180-ish: wrap in quotes if it contains comma, quote, or newline; double quotes inside.
  if (/[,"\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const safeName = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`
  const keys = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k))
      return set
    }, new Set<string>())
  )
  const header = keys.map(escapeCsvValue).join(',')
  const lines = rows.map((r) =>
    keys
      .map((k) => {
        const raw = r[k]
        const s = raw == null ? '' : String(raw)
        return escapeCsvValue(s)
      })
      .join(',')
  )
  const csvString = [header, ...lines].join('\n')
  const blob = new Blob([csvString], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

