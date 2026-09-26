import { Bell, ClipboardCheck, HeartHandshake, PencilRuler, Sparkles, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import type { AppNotification, NotificationKind } from '../../types'

const KIND: Record<NotificationKind, { icon: typeof Bell; tone: string; label: string }> = {
  assessment_results: { icon: ClipboardCheck, tone: 'bg-brand-soft text-brand-ink', label: 'Assessment results' },
  guidance_review: { icon: Sparkles, tone: 'bg-accent-50 text-accent-700 dark:bg-[#10302a] dark:text-[#7fd9c4]', label: 'AI guidance' },
  student_attention: { icon: TriangleAlert, tone: 'bg-bad-soft text-bad-ink', label: 'Attention' },
  parent_communication: { icon: HeartHandshake, tone: 'bg-warn-soft text-warn-ink', label: 'Parent communication' },
  practice_update: { icon: PencilRuler, tone: 'bg-good-soft text-good-ink', label: 'Practice' },
  system: { icon: Bell, tone: 'bg-surface-3 text-ink-2', label: 'System' },
}

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = Object.fromEntries(
  Object.entries(KIND).map(([k, v]) => [k, v.label]),
) as Record<NotificationKind, string>

interface NotificationItemProps {
  notification: AppNotification
  onOpen?: (n: AppNotification) => void
  compact?: boolean
}

export function NotificationItem({ notification: n, onOpen, compact }: NotificationItemProps) {
  const kind = KIND[n.kind]
  const Icon = kind.icon
  const body = (
    <div className={cn('flex gap-3', compact ? 'px-4 py-3' : 'px-5 py-4')}>
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', kind.tone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm text-ink', !n.read && 'font-semibold')}>{n.title}</p>
          {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
        </div>
        <p className={cn('mt-0.5 text-sm text-ink-2', compact && 'line-clamp-2')}>{n.body}</p>
        <p className="mt-1 text-xs text-ink-3">{n.time}</p>
      </div>
    </div>
  )
  const classes = cn('block w-full text-left transition-colors hover:bg-surface-2', !n.read && 'bg-brand-soft/40')
  return n.link ? (
    <Link to={n.link} onClick={() => onOpen?.(n)} className={classes}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={() => onOpen?.(n)} className={classes}>
      {body}
    </button>
  )
}
