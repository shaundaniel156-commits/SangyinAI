import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { NOTIFICATIONS } from '../data/notifications'
import { api } from '../lib/api'
import type { AppNotification } from '../types'
import { useLiveData } from './LiveDataContext'
import { useSession } from './SessionContext'

/** Read/unread state for the notifications. When signed in through the backend, marking read is saved there too. */
interface NotificationsValue {
  items: AppNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { role } = useSession()
  const { live } = useLiveData()
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(NOTIFICATIONS.filter((n) => n.read).map((n) => n.id)))

  const items = useMemo(
    // Notifications from the backend are already the signed-in user's own.
    () => NOTIFICATIONS.filter((n) => live || n.roles.includes(role)).map((n) => ({ ...n, read: readIds.has(n.id) })),
    [role, live, readIds],
  )

  const markRead = useCallback((id: string) => {
    setReadIds((s) => new Set(s).add(id))
    if (live) api(`/notifications/${id}/read`, { method: 'PATCH' }).catch((e) => console.warn('Could not save notification as read.', e))
  }, [live])
  const markAllRead = useCallback(() => {
    setReadIds((s) => new Set([...s, ...items.map((n) => n.id)]))
    if (live) api('/notifications/read-all', { method: 'PATCH' }).catch((e) => console.warn('Could not save notifications as read.', e))
  }, [items, live])

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
