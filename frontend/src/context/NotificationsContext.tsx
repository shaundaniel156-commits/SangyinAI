import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { NOTIFICATIONS } from '../data/notifications'
import type { AppNotification } from '../types'
import { useSession } from './SessionContext'

/** Frontend-only read/unread state for the demo notifications. */
interface NotificationsValue {
  items: AppNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { role } = useSession()
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(NOTIFICATIONS.filter((n) => n.read).map((n) => n.id)))

  const items = useMemo(
    () => NOTIFICATIONS.filter((n) => n.roles.includes(role)).map((n) => ({ ...n, read: readIds.has(n.id) })),
    [role, readIds],
  )

  const markRead = useCallback((id: string) => setReadIds((s) => new Set(s).add(id)), [])
  const markAllRead = useCallback(() => setReadIds((s) => new Set([...s, ...items.map((n) => n.id)])), [items])

  const value = useMemo(
    () => ({ items, unreadCount: items.filter((n) => !n.read).length, markRead, markAllRead }),
    [items, markRead, markAllRead],
  )
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
