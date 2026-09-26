import { BellOff, CheckCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NOTIFICATION_KIND_LABEL, NotificationItem } from '../../components/domain/NotificationItem'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { useNotifications } from '../../context/NotificationsContext'
import { useSession } from '../../context/SessionContext'
import type { NotificationKind } from '../../types'

type Filter = 'all' | 'unread' | NotificationKind

/** Display order for kind filters (only kinds present for the role are shown). */
const KIND_ORDER: NotificationKind[] = [
  'assessment_results',
  'guidance_review',
  'student_attention',
  'parent_communication',
  'practice_update',
  'system',
]

export function NotificationsPage() {
  const { role } = useSession()
  const { items, unreadCount, markRead, markAllRead } = useNotifications()
  const [filter, setFilter] = useState<Filter>('all')
  const simple = role === 'parent' || role === 'student'

  const tabs = useMemo(() => {
    const kinds = KIND_ORDER.filter((k) => items.some((n) => n.kind === k))
    return [
      { id: 'all' as Filter, label: 'All', count: items.length },
      { id: 'unread' as Filter, label: 'Unread', count: unreadCount },
      ...kinds.map((k) => ({ id: k as Filter, label: NOTIFICATION_KIND_LABEL[k], count: items.filter((n) => n.kind === k).length })),
    ]
  }, [items, unreadCount])

  const visible = items.filter((n) => (filter === 'all' ? true : filter === 'unread' ? !n.read : n.kind === filter))

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          simple
            ? 'Updates about learning, results and practice.'
            : 'Assessment results, AI guidance ready for review, students requiring attention and other updates.'
        }
        actions={
          <Button variant="secondary" onClick={markAllRead} disabled={unreadCount === 0} icon={<CheckCheck className="size-4" aria-hidden />}>
            Mark all as read
          </Button>
        }
      />

      <Card className="mx-auto max-w-3xl overflow-hidden">
        <Tabs label="Filter notifications" tabs={tabs} value={filter} onChange={setFilter} className="px-3" />
        {visible.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={filter === 'unread' ? "You're all caught up" : 'No notifications'}
            description={filter === 'unread' ? 'There are no unread notifications.' : 'New updates will appear here.'}
            action={
              filter !== 'all' ? (
                <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
                  Show all notifications
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((n) => (
              <li key={n.id}>
                <NotificationItem notification={n} onOpen={(item) => markRead(item.id)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mx-auto mt-3 max-w-3xl text-xs text-ink-3">Demo notifications for UI preview.</p>
    </>
  )
}
