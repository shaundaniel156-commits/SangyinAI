import { useState } from 'react'
import type { SeriesPoint } from '../../types'

interface ColumnChartProps {
  data: SeriesPoint[]
  height?: number
  valueSuffix?: string
  ariaLabel: string
}

/** Simple single-series column chart with hover values. */
export function ColumnChart({ data, height = 160, valueSuffix = '', ariaLabel }: ColumnChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className="relative flex h-full flex-1 flex-col items-center justify-end"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            {hover === i && (
              <span className="tabular absolute -top-1 z-10 -translate-y-full rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink shadow">
                {d.value}
                {valueSuffix}
              </span>
            )}
            <div
              className="w-full max-w-6 rounded-t bg-[var(--color-series-1)] transition-opacity"
              style={{ height: `${(d.value / max) * 100}%`, opacity: hover === null || hover === i ? 1 : 0.55 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-2 border-t border-line pt-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-xs text-ink-3">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}
