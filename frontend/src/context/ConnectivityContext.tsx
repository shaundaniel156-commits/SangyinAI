import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { liveState } from '../data/liveState'
import type { ConnectivityStatus } from '../types'

/**
 * Connection state for the status indicator: the browser's online/offline signal, and when the data was last
 * loaded from the server. Data already loaded stays usable offline; changes need a connection to save.
 */
interface ConnectivityValue {
  status: ConnectivityStatus
  lastSynced: string
  pendingItems: number
}

const ConnectivityContext = createContext<ConnectivityValue | null>(null)

const browserOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

function syncedLabel(): string {
  const at = liveState.loadedAt
  if (!at) return 'Not yet'
  const time = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return at.toDateString() === new Date().toDateString() ? `Today, ${time}` : `${at.toLocaleDateString()}, ${time}`
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(browserOnline)
  useEffect(() => {
    const update = () => setOnline(browserOnline())
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  const value = useMemo<ConnectivityValue>(() => ({ status: online ? 'online' : 'offline', lastSynced: syncedLabel(), pendingItems: 0 }), [online])
  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>
}

export function useConnectivity(): ConnectivityValue {
  const ctx = useContext(ConnectivityContext)
  if (!ctx) throw new Error('useConnectivity must be used within ConnectivityProvider')
  return ctx
}
