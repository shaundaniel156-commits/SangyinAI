import { BarChart3, Table2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Card, CardHeader } from '../ui/Card'
import { cn } from '../../lib/cn'

interface ChartContainerProps {
  title: string
  description?: string
  children: ReactNode
  /** Accessible table alternative for the chart. */
  table?: { headers: string[]; rows: (string | number)[][] }
  action?: ReactNode
  className?: string
  footnote?: string
}

/** Card wrapper for charts with a chart/table toggle and a demo-data footnote. */
export function ChartContainer({ title, description, children, table, action, className, footnote = 'Demo data for UI preview' }: ChartContainerProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title={title}
        description={description}
        action={
          <div className="flex items-center gap-2">
            {action}
            {table && (
              <div className="inline-flex rounded-lg border border-line p-0.5" role="group" aria-label="Chart view">
                <button
                  type="button"
                  onClick={() => setView('chart')}
                  aria-pressed={view === 'chart'}
                  className={cn('rounded-md p-1.5', view === 'chart' ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink')}
                  aria-label="Show chart"
                >
                  <BarChart3 className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setView('table')}
                  aria-pressed={view === 'table'}
                  className={cn('rounded-md p-1.5', view === 'table' ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink')}
                  aria-label="Show table"
                >
                  <Table2 className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        }
      />
      <div className="flex-1 p-5">
        {view === 'chart' || !table ? (
          children
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  {table.headers.map((h) => (
                    <th key={h} scope="col" className="px-2 py-2 text-left font-medium text-ink-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className="tabular px-2 py-2 text-ink">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {footnote && <p className="px-5 pb-4 text-xs text-ink-3">{footnote}</p>}
    </Card>
  )
}
