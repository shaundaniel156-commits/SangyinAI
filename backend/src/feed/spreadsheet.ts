import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'

// Reading uploaded spreadsheets, shared by Import Results and the Manual feed.

/** Reads the first sheet of a CSV or Excel (.xlsx) file into rows keyed by column heading. */
export async function readSpreadsheet(filename: string, data: Buffer): Promise<Record<string, string>[]> {
  if (/\.csv$/i.test(filename)) {
    return parse(data, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[]
  }
  if (/\.xlsx$/i.test(filename)) {
    const book = new ExcelJS.Workbook()
    await book.xlsx.load(data as unknown as ArrayBuffer)
    const sheet = book.worksheets[0]
    if (!sheet) return []
    const headings = (sheet.getRow(1).values as unknown[]).map((v) => String(v ?? '').trim())
    const rows: Record<string, string>[] = []
    sheet.eachRow((row, n) => {
      if (n === 1) return
      const record: Record<string, string> = {}
      row.eachCell((cell, col) => { if (headings[col]) record[headings[col]] = cell.text.trim() })
      if (Object.values(record).some(Boolean)) rows.push(record)
    })
    return rows
  }
  throw new Error('Upload a .csv or .xlsx file. Older .xls files: open them in Excel and save as .xlsx first.')
}

/** The column whose heading matches one of the names (case-insensitive, ignoring spaces and punctuation). */
export function column(headings: string[], names: string[]): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const wanted = names.map(norm)
  return headings.find((h) => wanted.includes(norm(h)))
}

/** A CSV line with quoting where needed. */
export function csvLine(values: string[]): string {
  return values.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')
}
