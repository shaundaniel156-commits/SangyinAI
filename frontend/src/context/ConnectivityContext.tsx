import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEMO_LAST_SYNCED, DEMO_PENDING_SYNC_ITEMS } from '../data/school'
import type { ConnectivityStatus } from '../types'

/**
 * UI-ONLY connectivity state for the offline-first indicators.
 * No real network detection or synchronisation happens here; the status can be
 * switched manually from the indicator menu to preview each state.
 */
interface ConnectivityValue {
  status: ConnectivityStatus
  lastSynced: string
  pendingItems: number
  setStatus: (s: ConnectivityStatus) => void
}

const ConnectivityContext = createContext<ConnectivityValue | null>(null)

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectivityStatus>('online')
  const value = useMemo<ConnectivityValue>(
    () => ({
      status,
      lastSynced: DEMO_LAST_SYNCED,
      pendingItems: status === 'online' ? 0 : DEMO_PENDING_SYNC_ITEMS,
      setStatus,
    }),
    [status],
  )
  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>
}

export function useConnectivity(): ConnectivityValue {
  const ctx = useContext(ConnectivityContext)
  if (!ctx) throw new Error('useConnectivity must be used within ConnectivityProvider')
  return ctx
}
