import nodemailer, { type Transporter } from 'nodemailer'

// Email through a Gmail account (GMAIL_USER and GMAIL_APP_PASSWORD), used by messaging/channels.ts. A stop-gap
// for the testing period: Resend only delivers to other people once a domain has been verified, and Gmail needs
// no domain. Gmail has its own limits, so this keeps count of the day's emails and stops before Google does.
// An email is reported as sent only when Gmail's server has accepted it.

export const gmailUser = () => process.env.GMAIL_USER?.trim() ?? ''
// Google shows the app password as four groups of four letters. It works however the groups were pasted: with
// spaces, underscores or dashes between them, or none.
const gmailPassword = () => (process.env.GMAIL_APP_PASSWORD ?? '').replace(/[\s_-]+/g, '')

/** True when both the Gmail address and its app password are set. */
export function gmailConfigured(): boolean {
  return Boolean(gmailUser() && gmailPassword())
}

// How long to wait: to reach Gmail on one port, and for one email once its turn has come (finding a port that
// works included), so a blocked port cannot leave a sign-up hanging.
const CONNECT_MS = 10_000
const SEND_MS = 20_000
// Emails are sent this many at a time; the rest wait their turn. One that has waited this long without getting
// a turn is not attempted and is reported as not sent. (At a second or two an email, about 60 to 120 emails get
// through in that time: enough for a whole staff list added at once.)
const AT_ONCE = 3
const QUEUE_WAIT_MS = 60_000
// 465 (TLS from the start) first; 587 (STARTTLS) if 465 cannot be reached. The one that worked is used from then on.
const PORTS = [465, 587] as const
let workingPort: number | undefined
// Some hosts block outgoing email ports altogether. After neither port could be reached, sends fail at once for
// this long instead of each waiting to find out again.
const BLOCKED_PAUSE_MS = 5 * 60_000
let blockedUntil = 0
// After Gmail refuses the sign-in, it is not tried again for this long: repeated wrong sign-ins can make Google
// lock the account out.
const SIGN_IN_PAUSE_MS = 2 * 60_000
let signInRefusedUntil = 0

// A personal Gmail account may send to about 500 people a day; going over can get the account restricted.
// GMAIL_MAX_SENDS_PER_DAY changes the limit kept here. Only emails Gmail accepted are counted, in memory (a
// restart starts the count again), by UTC day.
const sendsPerDay = () => {
  const set = process.env.GMAIL_MAX_SENDS_PER_DAY?.trim()
  const max = set ? Number.parseInt(set, 10) : Number.NaN
  return Number.isFinite(max) && max >= 0 ? max : 400
}
let countedDay = ''
let sentToday = 0
let limitLogged = false
// Emails being sent right now: counted with the day's total so that several at once cannot go past the limit.
let sending = 0

// One set of kept-open connections per port, signed in once and reused, not a new sign-in for every email.
const transporters = new Map<number, Transporter>()
let signedInAs = ''
function transporter(port: number): Transporter {
  // The address or password has changed: the old connections go.
  const account = `${gmailUser()}|${gmailPassword()}`
  if (signedInAs !== account) {
    for (const old of transporters.values()) old.close()
    transporters.clear()
    signedInAs = account
  }
  let t = transporters.get(port)
  if (!t) {
    t = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      pool: true,
      maxConnections: AT_ONCE,
      auth: { user: gmailUser(), pass: gmailPassword() },
      connectionTimeout: CONNECT_MS,
      greetingTimeout: CONNECT_MS,
      socketTimeout: SEND_MS,
    })
    transporters.set(port, t)
  }
  return t
}

type SmtpError = Error & { code?: string; responseCode?: number; response?: string; command?: string }
const TIMED_OUT = 'ETIMEDOUT'
const CONNECT_CODES = ['ECONNECTION', 'ECONNREFUSED', TIMED_OUT, 'ESOCKET', 'EDNS', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNRESET', 'ETLS']
// No reply from the server at all (as opposed to a reply that refuses something).
const noReply = (e: SmtpError) => !e.responseCode && CONNECT_CODES.includes(e.code ?? '')
const signInRefused = (e: SmtpError) => e.responseCode === 535 || e.responseCode === 534 || e.code === 'EAUTH'

const UNREACHABLE = 'The email service could not be reached: the connection was blocked or timed out.'
const TOO_SLOW = 'Gmail did not confirm the email in time, so it may not have arrived. Please try again.'
const LIMIT = 'The daily email limit has been reached. Email will work again tomorrow.'
const SIGN_IN = 'Gmail did not accept the sign-in: the app password is wrong, or 2-Step Verification is not turned on for the Gmail account.'
const TOO_MANY = 'Too many emails were waiting to be sent, so this one was not sent. Please try again in a minute.'

/** Why Gmail did not take an email, in plain words for the person who was sending it. */
function plainReason(e: SmtpError): string {
  const reply = e.response ?? ''
  if (signInRefused(e)) return SIGN_IN
  if (e.responseCode === 454 || /5\.4\.5|sending (quota|limit)/i.test(reply)) return 'Gmail’s daily sending limit has been reached. Email will work again tomorrow.'
  if (e.code === 'EENVELOPE' || [550, 551, 553, 501].includes(e.responseCode ?? 0)) return 'The email address was refused. Check that it is typed correctly.'
  return e.responseCode ? `Gmail refused the email (reply ${e.responseCode}).` : 'The email could not be sent.'
}
// For the server log: the reply number and kind of failure, never the reply's text (it can repeat an address).
const logReason = (e: SmtpError) => [e.code, e.responseCode && `reply ${e.responseCode}`].filter(Boolean).join(', ') || e.name

// Fails with a timeout after ms, whatever the work is doing.
function within<R>(ms: number, work: Promise<R>): Promise<R> {
  let timer: ReturnType<typeof setTimeout>
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timed out'), { code: TIMED_OUT })), Math.max(1, ms))
  })
  work.catch(() => {})
  return Promise.race([work, limit]).finally(() => clearTimeout(timer))
}

export interface GmailResult {
  sent: boolean
  /** Why not, in plain words. */
  error?: string
  /** For the log: the port used, or what went wrong. */
  detail: string
}
const failed = (error: string, detail: string): GmailResult => ({ sent: false, error, detail })

// --- Taking turns ----------------------------------------------------------------------------------

let busy = 0
const waiting: (() => void)[] = []
/** Waits for a turn to send. False when none came within QUEUE_WAIT_MS. */
function turn(): Promise<boolean> {
  if (busy < AT_ONCE) {
    busy++
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    const go = () => {
      clearTimeout(timer)
      resolve(true)
    }
    const timer = setTimeout(() => {
      waiting.splice(waiting.indexOf(go), 1)
      resolve(false)
    }, QUEUE_WAIT_MS)
    waiting.push(go)
  })
}
function turnOver() {
  const next = waiting.shift()
  // The turn passes straight to the next email waiting, if there is one.
  if (next) next()
  else busy--
}

// --- Finding a port that works ------------------------------------------------------------------------

// What finding a port came to: the port to use, or why there is none.
type Way = { port: number } | { refused: SmtpError; port: number } | { blocked: string }
let finding: Promise<Way> | undefined

/**
 * The port Gmail can be reached and signed in to on: the one that last worked, or else 465 and then 587 are
 * tried (connect and sign in, nothing sent). Emails that need this at the same moment share one try.
 */
function findPort(): Promise<Way> {
  if (workingPort) return Promise.resolve({ port: workingPort })
  finding ??= (async (): Promise<Way> => {
    const tried: string[] = []
    for (const port of PORTS) {
      try {
        await within(CONNECT_MS, transporter(port).verify())
        workingPort = port
        return { port }
      } catch (error) {
        const e = error as SmtpError
        // Reached Gmail and it said no (a wrong password, say): the other port would say the same.
        if (!noReply(e)) return { refused: e, port }
        tried.push(`${port} (${logReason(e)})`)
      }
    }
    // Neither port could be reached. On a host that blocks outgoing email (some do, to stop spam) this never works.
    if (Date.now() >= blockedUntil) {
      blockedUntil = Date.now() + BLOCKED_PAUSE_MS
      console.error(`[email] Gmail could not be reached on port ${tried.join(' or port ')}. OUTBOUND SMTP APPEARS TO BE BLOCKED BY THE HOST: Gmail cannot send from this server. Emails fail at once for the next ${BLOCKED_PAUSE_MS / 60_000} minutes, then it is tried again.`)
    }
    return { blocked: `ports ${PORTS.join(' and ')} unreachable` }
  })().finally(() => (finding = undefined))
  return finding
}

function signInWasRefused(e: SmtpError) {
  if (Date.now() >= signInRefusedUntil) {
    signInRefusedUntil = Date.now() + SIGN_IN_PAUSE_MS
    console.error(`[email] Gmail refused the sign-in (${logReason(e)}): check GMAIL_USER and GMAIL_APP_PASSWORD. Gmail is not tried again for ${SIGN_IN_PAUSE_MS / 60_000} minutes, so that Google does not lock the account.`)
  }
}

/** Sends one email through Gmail. Never throws. fromName: the name shown as the sender; the address is always the Gmail account's own. */
export async function sendWithGmail(to: string, subject: string, html: string, text: string, fromName: string): Promise<GmailResult> {
  const today = new Date(Date.now()).toISOString().slice(0, 10)
  if (countedDay !== today) {
    countedDay = today
    sentToday = 0
    limitLogged = false
  }
  const overLimit = () => {
    if (sentToday + sending < sendsPerDay()) return false
    if (!limitLogged && sentToday >= sendsPerDay()) {
      console.warn(`[email] Gmail has sent its ${sendsPerDay()} emails for today (GMAIL_MAX_SENDS_PER_DAY). No more are sent until midnight UTC, to keep the Gmail account from being restricted.`)
      limitLogged = true
    }
    return true
  }
  // Known at once, without waiting for a turn.
  const noGo = () =>
    overLimit()
      ? failed(LIMIT, 'daily limit kept by the server')
      : Date.now() < blockedUntil
        ? failed(UNREACHABLE, 'outgoing email ports were found blocked a few minutes ago')
        : Date.now() < signInRefusedUntil
          ? failed(SIGN_IN, 'the sign-in was refused a moment ago')
          : null
  const stopped = noGo()
  if (stopped) return stopped
  if (!(await turn())) return failed(TOO_MANY, `not attempted: no turn within ${QUEUE_WAIT_MS / 1000}s`)

  // From here the email has its turn: the time limit starts now, not while it was waiting.
  let counted = false
  try {
    // Things may have changed while it waited.
    const stoppedMeanwhile = noGo()
    if (stoppedMeanwhile) return stoppedMeanwhile
    sending++
    counted = true
    const began = Date.now()
    const message = { from: { name: fromName, address: gmailUser() }, to, subject, html, text }
    // Twice at most: a connection that had gone stale is found out on the first try and replaced for the second.
    for (let tries = 1; ; tries++) {
      const way = await findPort()
      // SEND_MS in all; but if finding a port used most of it, the email itself still gets CONNECT_MS.
      const deadline = Math.max(began + SEND_MS, Date.now() + CONNECT_MS)
      if ('blocked' in way) return failed(UNREACHABLE, way.blocked)
      if ('refused' in way) {
        if (signInRefused(way.refused)) signInWasRefused(way.refused)
        return failed(plainReason(way.refused), `port ${way.port}: ${logReason(way.refused)}`)
      }
      try {
        await within(deadline - Date.now(), transporter(way.port).sendMail(message))
        sentToday++
        return { sent: true, detail: `port ${way.port}` }
      } catch (error) {
        const e = error as SmtpError
        if (signInRefused(e)) signInWasRefused(e)
        if (e.responseCode || !noReply(e)) return failed(plainReason(e), `port ${way.port}: ${logReason(e)}`)
        // Gmail was reached on this port a moment ago but this email got no reply. Out of time: say so, and
        // nothing more is concluded (the host is not blocked; the next email is tried as usual).
        if (e.code === TIMED_OUT || Date.now() >= deadline || tries > 1) return failed(TOO_SLOW, `port ${way.port}: connected, but no confirmation within ${SEND_MS / 1000}s (${logReason(e)})`)
        // The connection itself failed: look for a working port again and try once more.
        if (workingPort === way.port) workingPort = undefined
      }
    }
  } finally {
    if (counted) sending--
    turnOver()
  }
}

/** The port Gmail last worked on, if it has. */
export const gmailPort = () => workingPort

/** For tests: forget the day's count, the working port and any pause, and close the connections. */
export function resetGmail() {
  countedDay = ''
  sentToday = 0
  limitLogged = false
  workingPort = undefined
  blockedUntil = 0
  signInRefusedUntil = 0
  signedInAs = ''
  for (const t of transporters.values()) t.close()
  transporters.clear()
}
