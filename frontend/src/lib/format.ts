const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const shortDateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

// A missing date, or one that can't be read, gives '' instead of an error, so it never breaks a page.
function readable(fmt: Intl.DateTimeFormat, iso: string | null | undefined): string {
  const date = new Date(iso || NaN)
  return Number.isNaN(date.getTime()) ? '' : fmt.format(date)
}

export function formatDate(iso: string | null | undefined): string {
  return readable(dateFmt, iso)
}

export function formatShortDate(iso: string | null | undefined): string {
  return readable(shortDateFmt, iso)
}

/** "Due 12 Nov 2026" ("Due 12 Nov" when short), or "No due date" when none was set. */
export function formatDue(iso: string | null | undefined, short = false): string {
  const date = short ? formatShortDate(iso) : formatDate(iso)
  return date ? `Due ${date}` : 'No due date'
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export function formatSignedPoints(value: number): string {
  if (value === 0) return '0 pts'
  return `${value > 0 ? '+' : '−'}${Math.abs(value)} pts`
}

export function initialsFrom(name: string): string {
  return name
    .split(' ')
    .filter((part) => /[A-Za-z0-9]/.test(part[0] ?? ''))
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}
