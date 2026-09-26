import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  /** Hide this column below the given breakpoint. */
  hideBelow?: 'sm' | 'md' | 'lg'
  align?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  pageSize?: number
  empty?: ReactNode
  caption?: string
}

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' }

export function DataTable<T>({ columns, rows, rowKey, onRowClick, pageSize = 10, empty, caption }: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const visible = useMemo(() => rows.slice(current * pageSize, current * pageSize + pageSize), [rows, current, pageSize])

  if (rows.length === 0 && empty) return <>{empty}</>

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line bg-surface-2">
              {columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-3',
                    ALIGN[c.align ?? 'left'],
                    c.hideBelow && HIDE[c.hideBelow],
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer hover:bg-surface-2')}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={cn('px-4 py-3 align-middle text-ink', ALIGN[c.align ?? 'left'], c.hideBelow && HIDE[c.hideBelow], c.className)}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-3">
          <span className="tabular">
            {current * pageSize + 1}–{Math.min(rows.length, (current + 1) * pageSize)} of {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              className="rounded-md p-1.5 hover:bg-surface-3 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="tabular px-1">
              Page {current + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount - 1}
              className="rounded-md p-1.5 hover:bg-surface-3 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
