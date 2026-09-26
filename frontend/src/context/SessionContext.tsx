import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { DEMO_USERS } from '../data/users'
import { readStorage, writeStorage } from '../lib/storage'
import type { Role, UserProfile } from '../types'

/**
 * DEMO session state. There is no real authentication: "signing in" simply
 * selects which role's interface to show. Replace with the auth module later.
 */
interface SessionValue {
  role: Role
  user: UserProfile
  signedIn: boolean
  signIn: (role: Role) => void
  signOut: () => void
  switchRole: (role: Role) => void
}

const SessionContext = createContext<SessionValue | null>(null)
const ROLE_KEY = 'sangyin.demo.role'
const ROLES: Role[] = ['teacher', 'admin', 'parent', 'student']

function initialRole(): Role | null {
  const stored = readStorage(ROLE_KEY)
  return stored && (ROLES as string[]).includes(stored) ? (stored as Role) : null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(initialRole)

  const signIn = useCallback((next: Role) => {
    setRole(next)
    writeStorage(ROLE_KEY, next)
  }, [])

  const signOut = useCallback(() => {
    setRole(null)
    writeStorage(ROLE_KEY, null)
  }, [])

  const value = useMemo<SessionValue>(() => {
    const active = role ?? 'teacher'
    return {
      role: active,
      user: DEMO_USERS[active],
      signedIn: role !== null,
      signIn,
      signOut,
      switchRole: signIn,
    }
  }, [role, signIn, signOut])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
