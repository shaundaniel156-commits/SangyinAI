import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationsContext'
import { NotificationItem } from '../domain/NotificationItem'
import { usePopover } from './usePopover'

export function NotificationMenu() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications()
  const { open, setOpen, ref } = usePopover()
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-3 hover:text-ink"
      >
        <Bell className="size-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="tabular absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-40 overflow-hidden rounded-xl border border-line bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-sm font-medium text-brand-ink hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 divide-y divide-line overflow-y-auto">
            {items.slice(0, 5).map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                compact
                onOpen={(x) => {
                  markRead(x.id)
                  setOpen(false)
                }}
              />
            ))}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-brand-ink hover:bg-surface-2"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
