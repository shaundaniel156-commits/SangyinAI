import type { ReactNode } from 'react'
import { DEMO_SCHOOL } from '../../../data/school'
import { cn } from '../../../lib/cn'

interface ReportDocumentProps {
  title: string
  subtitle?: string
  term: string
  period?: string
  children: ReactNode
}

/**
 * Printable report sheet. Styled restrained (hairlines, no fills) so it reads
 * as a document on screen and on paper. The print stylesheet below forces the
 * light palette so dark-mode users still get a legible printout.
 */
export function ReportDocument({ title, subtitle, term, period, children }: ReportDocumentProps) {
  const generated = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return (
    <article
      aria-label={`${title} preview`}
      className="report-doc rounded-xl border border-line bg-surface px-5 py-6 text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-8 sm:py-8 print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <style>{PRINT_CSS}</style>
      <header className="flex flex-col gap-4 border-b-2 border-ink pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink">Sangyin AI</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
        <dl className="grid shrink-0 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs sm:text-right">
          <dt className="text-ink-3">School</dt>
          <dd className="text-ink">{DEMO_SCHOOL.name}</dd>
          <dt className="text-ink-3">Term</dt>
          <dd className="text-ink">{term}</dd>
          {period && (
            <>
              <dt className="text-ink-3">Assessments</dt>
              <dd className="text-ink">{period}</dd>
            </>
          )}
          <dt className="text-ink-3">Generated</dt>
          <dd className="text-ink">{generated}</dd>
        </dl>
      </header>
      <p className="mt-3 inline-flex items-center rounded border border-dashed border-line-strong px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-3">
        Demo data — not real learner records
      </p>
      <div className="mt-6 space-y-7">{children}</div>
      <footer className="mt-8 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-3">
        Prepared with Sangyin AI (prototype). All figures are illustrative demo values for UI preview and do not describe real
        learners. Competency levels use demo display thresholds. Curriculum references are illustrative, not official NCDC or
        Cambridge International content.
      </footer>
    </article>
  )
}

export function DocSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function DocStats({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-4">
      {items.map((i, idx) => (
        <div key={i.label} className={cn('px-3 py-3', idx % 2 === 1 && 'border-l border-line', idx >= 2 && 'border-t border-line sm:border-t-0', idx === 2 && 'sm:border-l')}>
          <dt className="text-xs text-ink-3">{i.label}</dt>
          <dd className="tabular mt-0.5 text-lg font-semibold text-ink">{i.value}</dd>
          {i.hint && <dd className="text-[11px] text-ink-3">{i.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}

export interface DocColumn<T> {
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
}

/** Plain, un-paginated table suited to print. */
export function DocTable<T>({ columns, rows, rowKey, caption, empty = 'No records for the selected filters.' }: {
  columns: DocColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  caption: string
  empty?: string
}) {
  if (!rows.length) return <p className="text-sm text-ink-3">{empty}</p>
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line-strong">
            {columns.map((c) => (
              <th key={c.header} scope="col" className={cn('whitespace-nowrap px-2 py-2 text-xs font-medium text-ink-3 first:pl-0 last:pr-0', c.align === 'right' ? 'text-right' : 'text-left')}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="break-inside-avoid">
              {columns.map((c) => (
                <td key={c.header} className={cn('px-2 py-2 align-top text-ink first:pl-0 last:pr-0', c.align === 'right' && 'tabular text-right')}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Forces the light palette inside the report when printing, and keeps bar fills visible. */
const PRINT_CSS = `@media print {
  .report-doc {
    --color-surface: #ffffff; --color-surface-2: #f8f9fb; --color-surface-3: #eef0f4;
    --color-line: #e3e6ec; --color-line-strong: #cfd4dc;
    --color-ink: #121826; --color-ink-2: #4a5263; --color-ink-3: #6b7385;
    --color-brand-soft: #eef4fc; --color-brand-ink: #1a4e9d;
    --color-good: #15803d; --color-good-soft: #e8f6ec; --color-good-ink: #166534;
    --color-warn: #c47f00; --color-warn-soft: #fdf4e1; --color-warn-ink: #8a5a00;
    --color-bad: #c9372c; --color-bad-soft: #fdecea; --color-bad-ink: #a12a21;
    --color-series-1: #2a78d6; --color-grid: #e7e9ee;
    color: var(--color-ink);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}`
