import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { liveState } from '../data/liveState'
import { ApiError, getAuthProfile, getAuthToken } from '../lib/api'
import { loadLiveData } from '../lib/liveData'
import { useSession } from './SessionContext'

/**
 * Loads the signed-in user's data from the backend once after sign-in (lib/liveData.ts) and shows the
 * pages on top of it. If loading fails, it says so and offers to try again. After a change is saved,
 * refresh() reloads the data and redraws the pages.
 */
interface LiveDataValue {
  /** True when the pages show data loaded from the backend. */
  live: boolean
  /** Reloads everything from the backend and redraws the pages. */
  refresh: () => Promise<void>
}

const LiveDataContext = createContext<LiveDataValue>({ live: false, refresh: async () => {} })

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const { role, signedIn, signOut } = useSession()
  const token = signedIn ? getAuthToken() : null
  // The role to load as: the signed-in account's own role.
  const accountRole = getAuthProfile()?.role ?? role
  // `loadedFor` is the token whose data has finished loading (or failed to); a newer token means "loading".
  const [state, setState] = useState<{ loadedFor: string | null; live: boolean; version: number }>({ loadedFor: null, live: false, version: 0 })
  const wasLive = useRef(false)

  const load = useCallback(
    async (forToken: string) => {
      let live = false
      try {
        await loadLiveData(accountRole)
        live = true
        wasLive.current = true
      } catch (error) {
        // An expired or invalid sign-in: ask the user to sign in again. Anything else: offer to try again.
        if (error instanceof ApiError && error.status === 401) signOut()
        console.warn('Could not load data from the server.', error)
      }
      setState((s) => ({ loadedFor: forToken, live, version: s.version + 1 }))
    },
    [accountRole, signOut],
  )

  useEffect(() => {
    if (token && state.loadedFor !== token) void load(token)
    else if (!token && (wasLive.current || liveState.active)) {
      // Signed out after using real data: reload so no one's data stays in memory.
      window.location.reload()
    }
  }, [token, state.loadedFor, load])

  const refresh = useCallback(async () => {
    if (token) await load(token)
  }, [token, load])
  const live = Boolean(token) && state.live
  const value = useMemo<LiveDataValue>(() => ({ live, refresh }), [live, refresh])

  if (token && state.loadedFor !== token) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-ink-3" role="status">
        Loading your school data…
      </div>
    )
  }
  // The first load failed (a later refresh failing keeps the data already shown).
  if (token && !state.live && !wasLive.current) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4 text-center" role="alert">
        <div className="max-w-sm">
          <p className="text-base font-semibold text-ink">Couldn’t load your school data</p>
          <p className="mt-1 text-sm text-ink-3">The Sangyin server didn’t respond. Check your connection, then try again.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => void load(token)} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Try again
            </button>
            <button type="button" onClick={signOut} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2">
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }
  // A new key redraws every page with the freshly loaded data.
  return (
    <LiveDataContext.Provider value={value}>
      <Fragment key={state.version}>{children}</Fragment>
    </LiveDataContext.Provider>
  )
}

export function useLiveData(): LiveDataValue {
  return useContext(LiveDataContext)
}
