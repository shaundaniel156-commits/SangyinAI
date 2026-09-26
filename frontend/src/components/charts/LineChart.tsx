import { useId, useMemo, useState } from 'react'
import type { SeriesPoint } from '../../types'

export interface LineSeries {
  name: string
  points: SeriesPoint[]
  /** CSS colour, typically a series token such as var(--color-series-1). */
  color: string
}

interface LineChartProps {
  series: LineSeries[]
  height?: number
  min?: number
  max?: number
  valueSuffix?: string
  ariaLabel: string
}

const PAD = { top: 12, right: 44, bottom: 28, left: 36 }
const WIDTH = 640

/**
 * Minimal responsive SVG line chart: hairline grid, 2px lines, end labels,
 * and a hover crosshair with tooltip. One shared y-axis only.
 */
export function LineChart({ series, height = 240, min = 0, max = 100, valueSuffix = '%', ariaLabel }: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = useId()
  const labels = series[0]?.points.map((p) => p.label) ?? []
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (labels.length <= 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min)) * innerH
  const ticks = useMemo(() => {
    const step = (max - min) / 4
    return [0, 1, 2, 3, 4].map((i) => Math.round(min + step * i))
  }, [min, max])

  // Direct end labels only where they don't collide; otherwise legend + tooltip carry values.
  const lastYs = series.map((s) => (s.points.length ? y(s.points[s.points.length - 1]!.value) : 0))
  const showEndLabel = (i: number) => lastYs.every((ly, j) => j === i || Math.abs(ly - lastYs[i]!) >= 14)

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH
    const idx = Math.round(((px - PAD.left) / innerW) * (labels.length - 1))
    setHover(Math.max(0, Math.min(labels.length - 1, idx)))
  }

  return (
    <div className="relative">
      {series.length > 1 && (
        <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={series[0]?.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-grid)" strokeWidth={1} strokeDasharray="3 5" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[12px]">
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-ink-3 text-[12px]">
            {l}
          </text>
        ))}
        {series.length === 1 && series[0] && (
          <path
            d={`M ${x(0)} ${y(series[0].points[0]?.value ?? min)} ${series[0].points.map((p, i) => `L ${x(i)} ${y(p.value)}`).join(' ')} L ${x(labels.length - 1)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`}
            fill={`url(#${gradientId})`}
          />
        )}
        {series.map((s, si) => (
          <g key={s.name}>
            <polyline
              className="chart-draw"
              pathLength={1}
              points={s.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.points.length > 0 && (
              <>
                <circle cx={x(s.points.length - 1)} cy={y(s.points[s.points.length - 1]!.value)} r={4} fill={s.color} stroke="var(--color-surface)" strokeWidth={2} />
                {showEndLabel(si) && <text
                  x={x(s.points.length - 1) + 8}
                  y={y(s.points[s.points.length - 1]!.value)}
                  dy="0.32em"
                  className="fill-ink text-[12px] font-medium"
                >
                  {s.points[s.points.length - 1]!.value}
                  {valueSuffix}
                </text>}
              </>
            )}
          </g>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-line-strong)" strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.name} cx={x(hover)} cy={y(s.points[hover]?.value ?? 0)} r={4} fill={s.color} stroke="var(--color-surface)" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-32 -translate-x-1/2 rounded-xl border border-line-strong bg-surface/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
          style={{ left: `${Math.min(88, Math.max(12, (x(hover) / WIDTH) * 100))}%` }}
        >
          <p className="font-medium text-ink">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.name} className="mt-1 flex items-center justify-between gap-3 text-ink-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.name}
              </span>
              <span className="tabular font-medium text-ink">
                {s.points[hover]?.value}
                {valueSuffix}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
