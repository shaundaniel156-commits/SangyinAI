/** Where the backend lives, and the sign-in token sent with every request to it. */
// The live site always goes through its own /api address (vercel.json forwards it to the backend),
// because some networks block the backend's own address. Only local development calls it directly.
export const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL ?? 'http://localhost:4000') : '/api'

const TOKEN_KEY = 'sangyin.auth.token'
const PROFILE_KEY = 'sangyin.auth.profile'

/** The signed-in account, as the backend returned it at sign-in. */
export interface AuthProfile {
  id: string
  name: string
  email: string
  role: 'teacher' | 'admin' | 'parent' | 'student'
}

function store(remember: boolean): Storage {
  return remember ? window.localStorage : window.sessionStorage
}

function readKey(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** The saved sign-in token, if any. "Remember me" keeps it in localStorage, otherwise only for this tab. */
export function getAuthToken(): string | null {
  return readKey(TOKEN_KEY)
}

export function getAuthProfile(): AuthProfile | null {
  try {
    const raw = readKey(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as AuthProfile) : null
  } catch {
    return null
  }
}

/** Saves (or, with null, clears) the sign-in token and profile. */
export function setAuthToken(token: string | null, remember = false, profile?: AuthProfile): void {
  try {
    for (const key of [TOKEN_KEY, PROFILE_KEY]) {
      window.sessionStorage.removeItem(key)
      window.localStorage.removeItem(key)
    }
    if (token) {
      store(remember).setItem(TOKEN_KEY, token)
      if (profile) store(remember).setItem(PROFILE_KEY, JSON.stringify(profile))
    }
  } catch {
    /* storage unavailable: the user stays signed in until the page reloads */
  }
}

/** Headers for a JSON request to the backend, including the sign-in token when there is one. */
export function apiHeaders(): Record<string, string> {
  const token = getAuthToken()
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

/** A failed request: the HTTP status (0 = the server couldn't be reached) and the server's message. */
export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Calls the backend and returns the JSON reply. Throws ApiError with the server's own message on failure. */
export async function api<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body !== undefined || init.form ? 'POST' : 'GET'),
      // Content-Type only goes with a JSON body: the server rejects an empty body labelled as JSON (e.g. a DELETE).
      headers: init.body !== undefined ? apiHeaders() : { ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}) },
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    })
  } catch {
    throw new ApiError(0, 'The server could not be reached. Check your connection and try again.')
  }
  if (res.status === 204) return undefined as T
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
  if (!res.ok) throw new ApiError(res.status, body.message ?? body.error ?? `The server replied ${res.status}.`)
  return body as T
}
