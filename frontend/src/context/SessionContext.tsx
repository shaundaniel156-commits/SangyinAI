import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ROLE_USERS } from '../data/users'
import { API_URL, apiHeaders, getAuthProfile, setAuthToken, type AuthProfile } from '../lib/api'
import { readStorage, writeStorage } from '../lib/storage'
import type { SchoolSetup } from '../lib/classLevels'
import type { Role, UserProfile } from '../types'

/**
 * Session state. Signing in checks the email and password with the backend, which returns a token
 * that every request sends along. Signing in needs a connection to the server; once signed in, the
 * data already loaded stays usable if the connection drops.
 */
export interface SignInDetails {
  email: string
  password: string
  remember: boolean
  /** The school level and curriculum picked before signing in (saved to the school for administrators). */
  school?: SchoolSetup | null
}

export type SignInResult = { ok: true; role: Role } | { ok: false; error: string }

interface SessionValue {
  role: Role
  user: UserProfile
  signedIn: boolean
  signIn: (details: SignInDetails) => Promise<SignInResult>
  signOut: () => void
}

const SessionContext = createContext<SessionValue | null>(null)
const ROLE_KEY = 'sangyin.role'
const ROLES: Role[] = ['teacher', 'admin', 'parent', 'student']

/** "Jane Akello" → "JA", "Student 01" → "01". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/)
  const last = words.at(-1) ?? ''
  if (/^\d+$/.test(last)) return last.slice(-2)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? (last[0] ?? '') : '')).toUpperCase()
}

/** The saved role, only while a signed-in account is saved too. */
function initialRole(): Role | null {
  const stored = readStorage(ROLE_KEY)
  return stored && getAuthProfile() && (ROLES as string[]).includes(stored) ? (stored as Role) : null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(initialRole)
  const [profile, setProfile] = useState<AuthProfile | null>(getAuthProfile)

  const signIn = useCallback<SessionValue['signIn']>(async ({ email, password, remember, school }) => {
    let res: Response
    try {
      res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ email, password, ...(school ? { school } : {}) }) })
    } catch {
      return { ok: false, error: 'Can’t reach the Sangyin server. Check your connection and try again.' }
    }

    const body = (await res.json().catch(() => ({}))) as { token?: string; user?: AuthProfile; error?: string; message?: string }
    if (!res.ok || !body.token || !body.user) {
      return { ok: false, error: body.error === 'Too many requests' ? (body.message ?? body.error) : (body.error ?? 'Sign-in failed. Please try again.') }
    }
    setAuthToken(body.token, remember, body.user)
    setProfile(body.user)
    setRole(body.user.role)
    writeStorage(ROLE_KEY, body.user.role)
    return { ok: true, role: body.user.role }
  }, [])

  const signOut = useCallback(() => {
    setRole(null)
    writeStorage(ROLE_KEY, null)
    setAuthToken(null)
    setProfile(null)
  }, [])

  const value = useMemo<SessionValue>(() => {
    const active = role ?? 'teacher'
    // The signed-in account's own name and email.
    const signedInAs = profile && profile.role === active ? { id: profile.id, name: profile.name, email: profile.email, initials: initialsOf(profile.name) } : {}
    return {
      role: active,
      user: { ...ROLE_USERS[active], ...signedInAs },
      signedIn: role !== null && profile !== null,
      signIn,
      signOut,
    }
  }, [role, profile, signIn, signOut])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
