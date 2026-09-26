import { CloudOff, RefreshCw, Wifi } from 'lucide-react'
import { useConnectivity } from '../../context/ConnectivityContext'
import { cn } from '../../lib/cn'
import type { ConnectivityStatus } from '../../types'
import { usePopover } from './usePopover'

const STATES: Record<ConnectivityStatus, { label: string; icon: typeof Wifi; dot: string; pill: string }> = {
  online: { label: 'Online', icon: Wifi, dot: 'bg-good', pill: 'text-good-ink' },
  offline: { label: 'Offline', icon: CloudOff, dot: 'bg-ink-3', pill: 'text-ink-2' },
  syncing: { label: 'Syncing…', icon: RefreshCw, dot: 'bg-brand-500', pill: 'text-brand-ink' },
}

/**
 * Offline-first status indicator (UI ONLY). The status can be previewed from
 * the menu; no network detection or synchronisation is performed.
 */
export function ConnectivityIndicator({ compact = false }: { compact?: boolean }) {
  const { status, lastSynced, pendingItems, setStatus } = useConnectivity()
  const { open, setOpen, ref } = usePopover()
  const state = STATES[status]
  const Icon = state.icon

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={compact ? state.label : undefined}
        className={cn(
          compact
            ? 'grid size-9 shrink-0 place-items-center rounded-lg hover:bg-surface-3'
            : 'inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 text-sm font-medium hover:bg-surface-2',
          state.pill,
        )}
      >
        {compact ? (
          // Status dot: green (online, soft glow), grey (offline), blue pulsing (syncing)
          <span
            className={cn(
              'size-2.5 rounded-full',
              state.dot,
              status === 'online' && 'shadow-[0_0_0_3px_rgba(52,168,83,0.25)]',
              status === 'syncing' && 'animate-pulse',
            )}
            aria-hidden
          />
        ) : (
          <Icon className={cn('size-4', status === 'syncing' && 'animate-spin [animation-duration:2s]')} aria-hidden />
        )}
        <span className={cn(compact && 'sr-only')}>{state.label}</span>
        {!compact && status !== 'syncing' && <span className="hidden whitespace-nowrap font-normal text-ink-3 min-[1500px]:inline">· Last synced: {lastSynced}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Connection status" className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-4 shadow-xl">
          <div className="flex items-center gap-2">
            <span className={cn('size-2.5 rounded-full', state.dot)} aria-hidden />
            <p className="text-sm font-semibold text-ink">{state.label}</p>
          </div>
          <p className="mt-1 text-sm text-ink-2">
            {status === 'online' && 'All changes are saved and synchronised.'}
            {status === 'offline' && 'You can keep working. Changes are kept on this device and will sync when a connection is available.'}
            {status === 'syncing' && 'Sending changes saved on this device.'}
          </p>
          <dl className="mt-3 space-y-1.5 rounded-lg bg-surface-2 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">Last synced</dt>
              <dd className="text-ink">{lastSynced}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">Changes waiting to sync</dt>
              <dd className="tabular text-ink">{pendingItems}</dd>
            </div>
          </dl>
          <fieldset className="mt-4">
            <legend className="text-xs font-medium uppercase tracking-wide text-ink-3">Preview status (prototype)</legend>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(Object.keys(STATES) as ConnectivityStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  className={cn(
                    'rounded-md border px-2 py-1.5 text-xs font-medium',
                    status === s ? 'border-brand-500 bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2',
                  )}
                >
                  {STATES[s].label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-3">Synchronisation is not connected in this prototype.</p>
          </fieldset>
        </div>
      )}
    </div>
  )
}
