/**
 * Makes a CSV file from rows of text and downloads it. It starts with a byte-order mark so Excel reads accents
 * and the shilling sign correctly, and ends rows the way Excel expects.
 */
export function downloadCsv(filename: string, rows: string[][]): void {
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
