// TEMPORARY: testing-period sign-up. To switch it off, set SIGNUP_ENABLED=false on the server. To remove it for good:
//   1. delete this folder (backend/src/signup) and the two signupRoutes lines in backend/src/server.ts;
//   2. delete frontend/src/pages/auth/SignUpSection.tsx and its two lines in LoginPage.tsx;
//   3. remove the PendingSignup and SignupSend models from prisma/schema.prisma and add a migration:
//      DROP TABLE "PendingSignup"; DROP TABLE "SignupSend";
//      (User.emailVerifiedAt and User.phoneVerifiedAt can stay: they say what is known about each account.)
//   4. remove SIGNUP_ENABLED, SIGNUP_MAX_SENDS_PER_HOUR, SIGNUP_MAX_SMS_PER_HOUR, SIGNUP_MAX_SMS_PER_DAY,
//      SIGNUP_ALLOW_SANDBOX_SMS and SIGNUP_MAX_REQUESTS_PER_ADDRESS from .env.example and from the server's settings.
// Sooner than that, in a later release: take out the lines marked "compatibility with the page from before
// 2026-11-21" here (OLD_PAGE, emailCode) and in SignUpSection.tsx (emailCode). They keep a sign-up page that was
// loaded before that release working against this server, and this page working against the server before it.
// The email and SMS senders (messaging/channels.ts) are the app's own and stay.
//
// A person fills in the sign-up form, chooses to get a code by email or by text message, and types the code in
// to finish. Until then nothing is added to the User table: the details wait in PendingSignup, so existing
// accounts and sign-in are untouched. Each sign-up makes a new school with that person as its administrator, who
// can then add classes, teachers, students and parents the usual way. Nobody can sign themselves up into an
// existing school.
//
// The code proves only where it was sent. By email it proves the email address; by text message it proves the
// phone, and the email address (which is what the person signs in with) is NOT proven: the account records which
// (User.emailVerifiedAt, User.phoneVerifiedAt), and the address is sent a notice so that its real owner knows and
// can take the account over with "Forgot password?". An email that already has an account can never be signed up
// again, whichever way the code is sent.
//
// Each sign-up that is waiting belongs to the browser that started it: the start reply carries a ticket (a long
// random secret), and asking for a new code or finishing needs that ticket. So a second request naming the same
// email is a separate sign-up and never changes the first one's password, phone or school.

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { hash } from '@node-rs/argon2'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { attemptKeys, lockedMessage, recordFailure, type Counted } from '../auth/attempts.ts'
import { authConfigured, signToken } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { emailConfigured, maskEmail, normalisePhone, type SendResult } from '../messaging/channels.ts'
import { CODE_MINUTES, hiddenEmail, hiddenPhone, sendAlreadyRegistered, sendCreatedByPhone, sendSignupCode, signupChannels, type Channel } from './messaging.ts'

const MAX_WRONG_CODES = 5
const RESEND_WAIT_SECONDS = 60
// How many codes may be sent, counted in the database (SignupSend) so a restart does not forget them. Nothing the
// person asking writes (another email, a made-up visitor address) gets round a limit.
// - by text message to one phone, and by email to one address: what that phone or inbox can be made to receive;
// - by either way for one email, or for one phone: so that switching between the two does not add up to more
//   codes (each code allows 5 guesses, so at most 30 guesses an hour and 60 a day against one sign-up).
const PHONE_TEXTS = { hour: 3, day: 6 }
const EMAIL_EMAILS = { hour: 5, day: 10 }
const EITHER_WAY = { hour: 6, day: 12 }
const setting = (name: string, fallback: number) => Math.max(1, Number.parseInt(process.env[name] ?? '', 10) || fallback)
/** Every sign-up code together, by either way. SIGNUP_MAX_SENDS_PER_HOUR changes it. */
const allSendsPerHour = () => setting('SIGNUP_MAX_SENDS_PER_HOUR', 60)
/** Text messages cost money each, so they have ceilings of their own, whatever the emails are doing. */
const textsPerHour = () => setting('SIGNUP_MAX_SMS_PER_HOUR', 30)
const textsPerDay = () => setting('SIGNUP_MAX_SMS_PER_DAY', 150)
// Requests in 15 minutes (auth/attempts.ts), whatever emails they name: from one visitor address as the browser's
// proxy reports it (which a direct caller can make up), and from the address the server itself saw (which cannot
// be made up, but which everyone coming through the website shares).
// The second is set high because that address is probably one the website's own network shares between all its
// visitors; the limits above on what is sent are what keep the cost down. SIGNUP_MAX_REQUESTS_PER_ADDRESS changes it.
const VISITOR_MAX = 20
const hopMax = () => setting('SIGNUP_MAX_REQUESTS_PER_ADDRESS', 300)

/** On unless SIGNUP_ENABLED says false, 0, off or no. */
export function signupEnabled(): boolean {
  return !['false', '0', 'off', 'no'].includes((process.env.SIGNUP_ENABLED ?? 'true').trim().toLowerCase())
}
// Open: switched on, sign-in works, and there is at least one way to deliver a code.
const signupOpen = () => signupEnabled() && authConfigured() && (signupChannels().email || signupChannels().sms)

const ChannelChoice = z.enum(['email', 'sms'])
const StartSchema = z.object({
  name: z.string().trim().min(2).max(100),
  schoolName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  phone: z.string().trim().min(7).max(30),
  password: z.string().min(8).max(200),
  schoolType: z.enum(['primary', 'secondary']).default('primary'),
  framework: z.enum(['uganda', 'cambridge']).default('uganda'),
  channel: ChannelChoice.optional(),
})
// What to say for the first field that is wrong.
const FIELD_ERRORS: Record<string, string> = {
  name: 'Enter your full name.',
  schoolName: 'Enter the name of your school.',
  email: 'Enter a valid email address.',
  phone: 'Enter a real phone number, like 0772 123456 or +256 772 123456.',
  password: 'The password must be at least 8 characters.',
  schoolType: 'Choose primary or secondary for the type of school.',
  framework: 'Choose the national or the Cambridge curriculum.',
  channel: 'Choose how to get your code: by email or by text message.',
}
// Line breaks (of every kind), tabs and other characters that are not printable have no place in a name.
const UNPRINTABLE = /[\p{Cc}\p{Zl}\p{Zp}]/u
const UNPRINTABLE_ERRORS: Record<string, string> = {
  name: 'Your name has a line break or another character that cannot be used. Type it again on one line.',
  schoolName: 'The name of your school has a line break or another character that cannot be used. Type it again on one line.',
}
// Compatibility with the page from before 2026-11-21; remove in a later release. That page reads which codes to
// ask for from "needs" in every reply; it only ever asks for the emailed one, and never names a way to send.
const OLD_PAGE = { needs: { email: true, phone: false } }
const Ticket = z.string().min(20).max(200)
const Code = z.string().trim().regex(/^\d{6}$/)

// The countries the app serves, and so the only ones a code is texted to (Uganda, Kenya, Tanzania, Rwanda, South
// Sudan). Anywhere else could be a number that charges for each text it receives.
const TEXTED = /^\+(256|254|255|250|211)/
/**
 * The phone in international form, or null when it is plainly not a real number: all one digit, a country code
 * starting with 0, or the wrong length for an East African number (nine digits after the country code).
 */
function usablePhone(raw: string): string | null {
  const phone = normalisePhone(raw)
  if (!phone || !/^\+[1-9]\d{8,14}$/.test(phone)) return null
  const eastAfrican = /^\+(256|254|255|250|211)(\d*)$/.exec(phone)
  const national = eastAfrican ? eastAfrican[2]! : phone.slice(1)
  if (eastAfrican && !/^[1-9]\d{8}$/.test(national)) return null
  if (/^(\d)\1+$/.test(national) || /^(\d)\1+$/.test(phone.slice(1))) return null
  return phone
}

// The same counting as sign-in (auth/attempts.ts), under names of their own so that sign-up requests naming
// someone's email can never lock that person out of signing in. accounts: the email and phone (or the ticket)
// the request is about; each is counted, so neither can be used to get round the other's limit.
function requestKeys(request: FastifyRequest, ...accounts: string[]): Counted[] {
  const visitor = attemptKeys(request).find((k) => k.key.startsWith('visitor:'))
  return [
    ...accounts.flatMap((account) => attemptKeys(request, `signup:${account}`).filter((k) => !k.key.startsWith('hop:'))),
    ...(visitor ? [{ key: `signup-${visitor.key}`, max: VISITOR_MAX }] : []),
    // request.ip is the address the server's own proxy saw (server.ts, trustProxy), not a header the caller wrote.
    { key: `signup-hop:${request.ip}`, max: hopMax() },
  ]
}
// Wrong codes are counted apart from requests for codes, so asking for a new code never uses up the tries.
const codeKeys = (request: FastifyRequest, ticketHash: string) => attemptKeys(request, `signup-code:${ticketHash}`).filter((k) => !k.key.startsWith('hop:'))
// How long a "please wait N minutes" message asks for, in seconds (for the page's countdown).
const waitSeconds = (message: string) => Number(/wait (\d+) minute/.exec(message)?.[1] ?? 1) * 60

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')
// Only a keyed fingerprint of the code is stored, so the database alone does not give it away. The way it was
// sent is part of it: a code is good only for the way it went.
const codeHash = (ticketHash: string, channel: Channel, code: string) => createHmac('sha256', process.env.JWT_SECRET!).update(`${ticketHash}:${channel}:${code}`).digest('hex')
const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const expiry = () => new Date(Date.now() + CODE_MINUTES * 60_000)
const ago = (ms: number) => new Date(Date.now() - ms)
const HOUR = 60 * 60_000
const DAY = 24 * HOUR
const isChannel = (c: string): c is Channel => c === 'email' || c === 'sms'

type Over = 'all' | 'texts' | 'phone' | 'email' | 'either'
/**
 * Counts one more code sent this way for this email and phone. Returns what is over its limit (and then does not
 * count it), or null when the code may go.
 */
async function overLimit(email: string, phone: string, channel: Channel): Promise<Over | null> {
  const mine = await prisma.signupSend.create({ data: { email, phone, channel } })
  const count = (where: { email?: string; phone?: string; channel: Channel }, since: number) => prisma.signupSend.count({ where: { ...where, createdAt: { gt: ago(since) } } })
  // Both ways together: an email and a text message count for the same email, and for the same phone.
  const either = async (who: { email: string } | { phone: string }, since: number) => (await count({ ...who, channel: 'email' }, since)) + (await count({ ...who, channel: 'sms' }, since))
  const [emailsHour, textsHour, textsDay, mineHour, mineDay, emailHour, emailDay, phoneHour, phoneDay] = await Promise.all([
    count({ channel: 'email' }, HOUR),
    count({ channel: 'sms' }, HOUR),
    count({ channel: 'sms' }, DAY),
    count(channel === 'sms' ? { phone, channel } : { email, channel }, HOUR),
    count(channel === 'sms' ? { phone, channel } : { email, channel }, DAY),
    either({ email }, HOUR),
    either({ email }, DAY),
    either({ phone }, HOUR),
    either({ phone }, DAY),
  ])
  const own = channel === 'sms' ? PHONE_TEXTS : EMAIL_EMAILS
  const over: Over | null =
    emailsHour + textsHour > allSendsPerHour()
      ? 'all'
      : channel === 'sms' && (textsHour > textsPerHour() || textsDay > textsPerDay())
        ? 'texts'
        : mineHour > own.hour || mineDay > own.day
          ? channel === 'sms' ? 'phone' : 'email'
          : emailHour > EITHER_WAY.hour || emailDay > EITHER_WAY.day || phoneHour > EITHER_WAY.hour || phoneDay > EITHER_WAY.day
            ? 'either'
            : null
  if (over) await prisma.signupSend.delete({ where: { id: mine.id } })
  return over
}

/**
 * Sends a notice (not a code) to an email address, only when the server can send email. Never waited for and
 * never fails the sign-up. Kept apart from the limits above, so whether a notice went changes nothing the person
 * signing up can see. oncePerDay: no more than one such notice to an address in a day (UTC), however many
 * requests arrive at the same moment: the record of it can exist only once (SignupSend.onceKey is unique), and
 * only the request that manages to write it sends.
 */
function notify(email: string, phone: string, send: () => Promise<SendResult>, oncePerDay = false) {
  if (!emailConfigured()) return
  void (async () => {
    const onceKey = oncePerDay ? `notice:${new Date().toISOString().slice(0, 10)}:${email}` : null
    try {
      await prisma.signupSend.create({ data: { email, phone, channel: 'notice', onceKey } })
    } catch {
      // Already recorded today (by an earlier request, or one a moment ago): nothing more to send.
      return
    }
    await send()
  })().catch(() => {})
}

// The addresses sign-up requests have been seen from since the server started, each written to the log once, so
// the log shows whether visitors share one. (Only the address: never an email, a phone, a code or a ticket.)
const addressesSeen = new Set<string>()
function noteAddress(request: FastifyRequest) {
  if (addressesSeen.has(request.ip) || addressesSeen.size >= 200) return
  addressesSeen.add(request.ip)
  request.log.info({ address: request.ip, limit: hopMax() }, 'sign-up: first request seen from this address (requests from it are limited together)')
}

const NOT_FOUND = { error: 'Sign-up is not open.' }
const UNAVAILABLE = 'Sign-up is unavailable right now. Please try again later.'
const EXPIRED = 'This sign-up has run out of time. Go back and start it again.'
const DEAD = 'Too many wrong codes. Ask for a new code and try again.'
const WRONG: Record<Channel, string> = {
  email: 'The code from your email is not right, or it has expired. Check it, or ask for a new code.',
  sms: 'The code from your text message is not right, or it has expired. Check it, or ask for a new code.',
}
// The code was right but the account cannot be made (the email already has one). Said the same way whatever the reason.
const NOT_FINISHED = 'This sign-up could not be finished. If you already have an account, sign in above or choose “Forgot password?”. Otherwise go back and start again.'
const WAY: Record<Channel, string> = { email: 'email', sms: 'text message' }
const other = (channel: Channel): Channel => (channel === 'email' ? 'sms' : 'email')
// "Choose email instead." when the other way is on offer, else nothing.
const instead = (channel: Channel) => (signupChannels()[other(channel)] ? ` Choose ${WAY[other(channel)]} instead.` : '')

// What to say when a way cannot be used, or a code could not be sent. Nothing here depends on whether the email
// has an account.
const notOffered = (channel: Channel) => `Codes cannot be sent by ${WAY[channel]} right now.${instead(channel)}`
const OUTSIDE = (channel: Channel) => `Codes are sent by text message only to phone numbers in Uganda, Kenya, Tanzania, Rwanda and South Sudan.${instead(channel)}`
function overMessage(over: Exclude<Over, 'all'>): string {
  if (over === 'texts') return `Text messages are unavailable right now.${instead('sms') || ' Please try again later.'}`
  if (over === 'phone') return `Too many codes have been sent to this phone number.${instead('sms') || ' Please try again later.'}`
  if (over === 'email') return `Too many codes have been sent to this email address.${instead('email') || ' Please try again later.'}`
  return 'Too many codes have been sent for this sign-up. Please try again in an hour.'
}
function notSent(channel: Channel, result: SendResult): string {
  // The number itself cannot be texted: say so (the same whoever's email it is).
  if (channel === 'sms' && result.numberRefused) return `${result.error}${instead('sms')}`
  return `We could not send your code by ${WAY[channel]} right now.${instead(channel) ? `${instead(channel)} Or try again in a few minutes.` : ' Please try again in a few minutes.'}`
}
const sentTo = (channel: Channel, email: string, phone: string) => (channel === 'sms' ? hiddenPhone(phone) : hiddenEmail(email))
const offered = () => ({ email: signupChannels().email, sms: signupChannels().sms })

export async function signupRoutes(app: FastifyInstance) {
  // Something the server could not read (broken JSON, say) gets a plain message, on these routes only.
  app.setErrorHandler((error: { statusCode?: number }, request, reply) => {
    if (error.statusCode && error.statusCode < 500) return reply.code(400).send({ error: 'We could not read what was sent. Reload the page and try again.' })
    request.log.error(error, 'sign-up failed')
    return reply.code(503).send({ error: UNAVAILABLE })
  })

  // Is sign-up open, and which ways can a code be sent? The sign-in page asks this before showing the form.
  // smsTest: text messages go to the Africa's Talking simulator, not to phones (the page says so).
  app.get('/auth/signup', async () => {
    const { email, sms, smsTest } = signupChannels()
    return { enabled: signupOpen(), channels: { email, sms }, smsTest, ...OLD_PAGE }
  })

  // Step 1: the details, and which way to send the code. Saves them as a sign-up that is waiting and sends the
  // code. Everything here is the same whether or not the email already has an account, like forgot-password.
  app.post('/auth/signup', async (request, reply) => {
    if (!signupOpen()) return reply.code(404).send(NOT_FOUND)
    const parsed = StartSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: FIELD_ERRORS[String(parsed.error.issues[0]?.path[0])] ?? 'Fill in every field.' })
    const { name, schoolName, email, password, schoolType, framework } = parsed.data
    const unprintable = UNPRINTABLE.test(name) ? 'name' : UNPRINTABLE.test(schoolName) ? 'schoolName' : null
    if (unprintable) return reply.code(400).send({ error: UNPRINTABLE_ERRORS[unprintable] })
    const phone = usablePhone(parsed.data.phone)
    if (!phone) return reply.code(400).send({ error: FIELD_ERRORS.phone })
    // Email unless the person chose text message. (The page always says which; a request that does not is from
    // the page from before 2026-11-21, which can only take an emailed code.)
    const channel: Channel = parsed.data.channel ?? 'email'
    if (!signupChannels()[channel]) return reply.code(400).send({ error: notOffered(channel) })
    if (channel === 'sms' && !TEXTED.test(phone)) return reply.code(400).send({ error: OUTSIDE(channel) })
    noteAddress(request)

    // Every request counts, so nobody can use this to flood an inbox or a phone with codes.
    const keys = requestKeys(request, email, phone)
    const locked = lockedMessage(keys, 'sign-up requests')
    if (locked) return reply.code(429).send({ error: locked })
    recordFailure(keys)

    try {
      const passwordHash = await hash(password)
      const existing = await prisma.user.findUnique({ where: { email }, select: { name: true } })
      // Sign-ups that were never finished, and the record of what was sent, are cleared out after a day.
      await prisma.pendingSignup.deleteMany({ where: { createdAt: { lt: ago(DAY) } } })
      await prisma.signupSend.deleteMany({ where: { createdAt: { lt: ago(DAY) } } })
      const over = await overLimit(email, phone, channel)
      if (over) return over === 'all' ? reply.code(503).send({ error: UNAVAILABLE }) : reply.code(429).send({ error: overMessage(over) })

      const ticket = randomBytes(32).toString('base64url')
      const ticketHash = sha256(ticket)
      const code = newCode()
      await prisma.pendingSignup.create({ data: { ticketHash, email, phone, name, schoolName, schoolType, framework, passwordHash, channel, codeHash: codeHash(ticketHash, channel, code), expiresAt: expiry() } })
      const result = await sendSignupCode({ name: existing?.name ?? name, email, phone }, channel, code, Boolean(existing))
      if (!result.sent) {
        await prisma.pendingSignup.deleteMany({ where: { ticketHash } })
        return reply.code(502).send({ error: notSent(channel, result) })
      }
      // By text message the address's owner hears nothing, so they are told separately (by email they just were).
      if (existing && channel === 'sms') notify(email, phone, () => sendAlreadyRegistered({ name: existing.name, email }), true)
      return { sent: true, ticket, channel, sentTo: sentTo(channel, email, phone), channels: offered(), expiresInMinutes: CODE_MINUTES, resendInSeconds: RESEND_WAIT_SECONDS, ...OLD_PAGE }
    } catch (error) {
      request.log.error(error, 'sign-up failed')
      return reply.code(503).send({ error: UNAVAILABLE })
    }
  })

  // A new code for a sign-up that is waiting, the same way or (channel) the other way: at most once a minute,
  // within the limits above, and not while the person is locked out for wrong codes. The old code stops working.
  app.post('/auth/signup/resend', async (request, reply) => {
    if (!signupOpen()) return reply.code(404).send(NOT_FOUND)
    const parsed = z.object({ ticket: Ticket, channel: ChannelChoice.optional() }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.path[0] === 'channel' ? FIELD_ERRORS.channel : EXPIRED })
    const ticketHash = sha256(parsed.data.ticket)
    const keys = requestKeys(request, ticketHash)
    const locked = lockedMessage(codeKeys(request, ticketHash), 'wrong codes') ?? lockedMessage(keys, 'sign-up requests')
    if (locked) return reply.code(429).send({ error: locked, waitSeconds: waitSeconds(locked) })
    recordFailure(keys)

    try {
      const pending = await prisma.pendingSignup.findUnique({ where: { ticketHash } })
      if (!pending || !isChannel(pending.channel)) return reply.code(400).send({ error: EXPIRED })
      const channel: Channel = parsed.data.channel ?? pending.channel
      if (!signupChannels()[channel]) return reply.code(400).send({ error: notOffered(channel) })
      if (channel === 'sms' && !TEXTED.test(pending.phone)) return reply.code(400).send({ error: OUTSIDE(channel) })
      const wait = Math.ceil((pending.lastSentAt.getTime() + RESEND_WAIT_SECONDS * 1000 - Date.now()) / 1000)
      if (wait > 0) return reply.code(429).send({ error: `Please wait ${wait} ${wait === 1 ? 'second' : 'seconds'} before asking for another code.`, waitSeconds: wait })
      const over = await overLimit(pending.email, pending.phone, channel)
      if (over) return over === 'all' ? reply.code(503).send({ error: UNAVAILABLE }) : reply.code(429).send({ error: overMessage(over) })

      const code = newCode()
      const existing = await prisma.user.findUnique({ where: { email: pending.email }, select: { name: true } })
      const result = await sendSignupCode({ name: existing?.name ?? pending.name, email: pending.email, phone: pending.phone }, channel, code, Boolean(existing))
      // Not sent: the code the person already has stays good.
      if (!result.sent) return reply.code(502).send({ error: notSent(channel, result) })
      await prisma.pendingSignup.update({ where: { id: pending.id }, data: { channel, codeHash: codeHash(ticketHash, channel, code), attempts: 0, lastSentAt: new Date(), expiresAt: expiry() } })
      return { sent: true, channel, sentTo: sentTo(channel, pending.email, pending.phone), channels: offered(), expiresInMinutes: CODE_MINUTES, resendInSeconds: RESEND_WAIT_SECONDS, ...OLD_PAGE }
    } catch (error) {
      request.log.error(error, 'sign-up resend failed')
      return reply.code(503).send({ error: UNAVAILABLE })
    }
  })

  // Step 2: the code, checked against the one last sent. Then the school and its administrator account are
  // created and the person is signed in, with the same reply as /auth/login. Five wrong tries at a code and it is
  // dead; a new one must be asked for.
  app.post('/auth/signup/verify', async (request, reply) => {
    if (!signupOpen()) return reply.code(404).send(NOT_FOUND)
    // emailCode: compatibility with the page from before 2026-11-21 (its name for the code); remove in a later release.
    const parsed = z.object({ ticket: Ticket, code: Code.optional(), emailCode: Code.optional() }).safeParse(request.body)
    const code = parsed.success ? (parsed.data.code ?? parsed.data.emailCode) : undefined
    if (!parsed.success || !code) return reply.code(400).send({ error: 'Enter the 6-digit code we sent you.' })
    const ticketHash = sha256(parsed.data.ticket)
    const keys = codeKeys(request, ticketHash)
    const locked = lockedMessage(keys, 'wrong codes')
    if (locked) return reply.code(429).send({ error: locked, waitSeconds: waitSeconds(locked) })
    const refuse = (error: string) => {
      const lockedNow = recordFailure(keys)
      if (lockedNow.length) request.log.warn('sign-up locked after too many wrong codes')
      return reply.code(400).send({ error })
    }

    try {
      const pending = await prisma.pendingSignup.findUnique({ where: { ticketHash } })
      if (!pending || !isChannel(pending.channel)) return refuse(EXPIRED)
      const channel = pending.channel
      // Each try is counted before the code is looked at, so several tries sent at once cannot get past the limit.
      const counted = await prisma.pendingSignup.updateMany({ where: { id: pending.id, expiresAt: { gt: new Date() }, attempts: { lt: MAX_WRONG_CODES } }, data: { attempts: { increment: 1 } } })
      if (!counted.count) return refuse(pending.expiresAt > new Date() ? DEAD : WRONG[channel])
      if (!sameHash(pending.codeHash, codeHash(ticketHash, channel, code))) return refuse(pending.attempts + 1 >= MAX_WRONG_CODES ? DEAD : WRONG[channel])

      // The email already has an account. Nothing is created or changed, whoever holds the phone.
      if (await prisma.user.findUnique({ where: { email: pending.email }, select: { id: true } })) {
        await prisma.pendingSignup.deleteMany({ where: { id: pending.id } })
        return refuse(NOT_FINISHED)
      }
      const now = new Date()
      const user = await prisma.$transaction(async (tx) => {
        const school = await tx.school.create({ data: { name: pending.schoolName, type: pending.schoolType, framework: pending.framework } })
        const created = await tx.user.create({
          data: {
            schoolId: school.id,
            name: pending.name,
            email: pending.email,
            phone: pending.phone,
            role: 'admin',
            status: 'active',
            passwordHash: pending.passwordHash,
            lastActiveAt: now,
            // What the code proved: the address it was emailed to, or the phone it was texted to. Not both.
            emailVerifiedAt: channel === 'email' ? now : null,
            phoneVerifiedAt: channel === 'sms' ? now : null,
          },
        })
        // Other sign-ups waiting for the same email can no longer be finished.
        await tx.pendingSignup.deleteMany({ where: { email: pending.email } })
        return created
      })
      request.log.info({ account: maskEmail(user.email), provedBy: channel }, 'sign-up finished: new school and administrator created')
      // The address was not proven: tell it, so its real owner knows and can take the account over.
      if (channel === 'sms') notify(pending.email, pending.phone, () => sendCreatedByPhone({ name: pending.name, email: pending.email, phone: pending.phone }))
      return { token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } }
    } catch (error) {
      // P2002: the email got an account at the same moment, some other way.
      if ((error as { code?: string }).code === 'P2002') return refuse(NOT_FINISHED)
      request.log.error(error, 'sign-up verify failed')
      return reply.code(503).send({ error: UNAVAILABLE })
    }
  })
}
