const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const shortDateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

export function formatShortDate(iso: string): string {
  return shortDateFmt.format(new Date(iso))
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
