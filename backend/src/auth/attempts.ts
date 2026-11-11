import type { FastifyRequest } from 'fastify'

// Limits on sign-in, forgot-password and reset-password, to slow password guessing. Failed attempts are counted
// in this process's memory for 15 minutes, under up to three keys at once:
// - the account (lower-cased email) together with the visitor's address, as the proxy in front of the browser
//   reports it (x-vercel-forwarded-for through the website's /api, else the first X-Forwarded-For entry). Ten
//   failures lock that account for that address only, so a stranger guessing a teacher's password from their own
//   phone does not lock the teacher out of their own;
// - the account alone, across every address: fifty failures lock it for everyone. This is what still holds when
//   a client calling this server directly makes up a different visitor address for each guess;
// - the address the last proxy (Render) saw, the right-most X-Forwarded-For entry, which a client cannot forge,
//   counted only for requests that do not come through the website (no x-vercel-forwarded-for header), so website
//   visitors never share a counter. A direct caller can add that header too; the account cap above still applies.

const WINDOW_MS = 15 * 60_000

export const LIMITS = {
  /** Failed attempts on one account from one visitor address. */
  visitor: 10,
  /** Failed attempts on one account from all addresses together. */
  account: 50,
  /** Failed attempts from one last-hop address calling the server directly. */
  hop: 300,
} as const

/** A key to count under, and how many failures it allows in the window. */
export interface Counted {
  key: string
  max: number
}

const failures = new Map<string, { count: number; resetAt: number }>()

function tidy(now: number) {
  for (const [key, f] of failures) if (f.resetAt <= now) failures.delete(key)
}

/** The keys to count a request under: for the account named (sign-in, forgot-password) or, without one, the visitor alone. */
export function attemptKeys(request: FastifyRequest, email?: string): Counted[] {
  const forwarded = String(request.headers['x-forwarded-for'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const vercel = String(request.headers['x-vercel-forwarded-for'] ?? '').split(',')[0]?.trim()
  const socket = request.socket.remoteAddress ?? 'unknown'
  const visitor = vercel || forwarded[0] || socket
  const keys: Counted[] = []
  if (email !== undefined) {
    const account = email.trim().toLowerCase()
    keys.push({ key: `account+visitor:${account}|${visitor}`, max: LIMITS.visitor }, { key: `account:${account}`, max: LIMITS.account })
  } else {
    keys.push({ key: `visitor:${visitor}`, max: LIMITS.visitor })
  }
  // Direct callers only: through the website every request would share Vercel's address.
  if (!vercel) keys.push({ key: `hop:${forwarded.at(-1) ?? socket}`, max: LIMITS.hop })
  return keys
}

/** When one of the keys has reached its limit: a plain message saying how long to wait. Otherwise null. */
export function lockedMessage(keys: Counted[], what = 'attempts'): string | null {
  const now = Date.now()
  tidy(now)
  let until: number | null = null
  for (const { key, max } of keys) {
    const f = failures.get(key)
    if (f && f.count >= max) until = until === null ? f.resetAt : Math.max(until, f.resetAt)
  }
  if (until === null) return null
  const minutes = Math.max(1, Math.ceil((until - now) / 60_000))
  return `Too many ${what}. Please wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and try again.`
}

/** Counts one failed attempt under each key. */
export function recordFailure(keys: Counted[]) {
  const now = Date.now()
  for (const { key } of keys) {
    const f = failures.get(key)
    if (f && f.resetAt > now) f.count++
    else failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
  }
}

/**
 * A successful sign-in clears the count for that account from that visitor address (the first key), and nothing
 * else: the account-wide count and the last-hop count keep what others have done.
 */
export function clearFailures(keys: Counted[]) {
  const first = keys[0]
  if (first) failures.delete(first.key)
}

/** For tests: forget every count. */
export function resetAttempts() {
  failures.clear()
}
