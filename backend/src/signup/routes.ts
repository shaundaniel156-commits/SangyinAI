// TEMPORARY: testing-period sign-up. To switch it off, set SIGNUP_ENABLED=false on the server. To remove it for good:
//   1. delete this folder (backend/src/signup) and the two signupRoutes lines in backend/src/server.ts;
//   2. delete frontend/src/pages/auth/SignUpSection.tsx and its two lines in LoginPage.tsx;
//   3. remove the PendingSignup and SignupSend models from prisma/schema.prisma and add a migration:
//      DROP TABLE "PendingSignup"; DROP TABLE "SignupSend";
//   4. remove SIGNUP_ENABLED, SIGNUP_MAX_SENDS_PER_HOUR and SIGNUP_MAX_REQUESTS_PER_ADDRESS from .env.example and from the server's settings.
// The email and SMS senders (messaging/channels.ts) are the app's own and stay.
//
// A person fills in the sign-up form, is sent one code by email and a different one by SMS, and types in the
// codes asked for (signup/messaging.ts says which) to finish. Until then nothing is added to the User table: the
// details wait in PendingSignup, so existing accounts and sign-in are untouched. Each sign-up makes a new school
// with that person as its administrator, who can then add classes, teachers, students and parents the usual way.
// Nobody can sign themselves up into an existing school.
//
// Each sign-up that is waiting belongs to the browser that started it: the start reply carries a ticket (a long
// random secret), and asking for new codes or finishing needs that ticket. So a second request naming the same
// email is a separate sign-up and never changes the first one's password, phone or school.

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { hash } from '@node-rs/argon2'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { attemptKeys, lockedMessage, recordFailure, type Counted } from '../auth/attempts.ts'
import { authConfigured, signToken } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { maskEmail, normalisePhone } from '../messaging/channels.ts'
import { CODE_MINUTES, sendSignupCodes, signupNeeds, signupUsable } from './messaging.ts'

const MAX_WRONG_CODES = 5
const RESEND_WAIT_SECONDS = 60
// How many times codes may be sent, counted in the database (SignupSend) so a restart does not forget them.
// Nothing the person asking writes (another email, a made-up visitor address) gets round the phone's limit.
const PHONE_SENDS = { hour: 3, day: 6 }
const EMAIL_SENDS = { hour: 5, day: 10 }
/** Every sign-up together, as a ceiling on what the messages can cost. SIGNUP_MAX_SENDS_PER_HOUR changes it. */
const allSendsPerHour = () => Math.max(1, Number.parseInt(process.env.SIGNUP_MAX_SENDS_PER_HOUR ?? '', 10) || 60)
// Requests in 15 minutes (auth/attempts.ts), whatever emails they name: from one visitor address as the browser's
// proxy reports it (which a direct caller can make up), and from the address the server itself saw (which cannot
// be made up, but which everyone coming through the website shares).
// The second is set high because that address is probably one the website's own network shares between all its
// visitors; the limits above on what is sent are what keep the cost down. SIGNUP_MAX_REQUESTS_PER_ADDRESS changes it.
const VISITOR_MAX = 20
const hopMax = () => Math.max(1, Number.parseInt(process.env.SIGNUP_MAX_REQUESTS_PER_ADDRESS ?? '', 10) || 300)

/** On unless SIGNUP_ENABLED says false, 0, off or no. */
export function signupEnabled(): boolean {
  return !['false', '0', 'off', 'no'].includes((process.env.SIGNUP_ENABLED ?? 'true').trim().toLowerCase())
}
// Open: switched on, sign-in works, and there is a way to deliver a code.
const signupOpen = () => signupEnabled() && authConfigured() && signupUsable()

const StartSchema = z.object({
  name: z.string().trim().min(2).max(100),
  schoolName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  phone: z.string().trim().min(7).max(30),
  password: z.string().min(8).max(200),
  schoolType: z.enum(['primary', 'secondary']).default('primary'),
  framework: z.enum(['uganda', 'cambridge']).default('uganda'),
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
}
const Ticket = z.string().min(20).max(200)
const Code = z.string().trim().regex(/^\d{6}$/)

/**
 * The phone in international form, or null when it is plainly not a real number: all one digit, a country code
 * starting with 0, or the wrong length for an East African number (+256, +254, +255, +250, +211: nine digits).
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
// someone's email can never lock that person out of signing in.
function requestKeys(request: FastifyRequest, account: string): Counted[] {
  const visitor = attemptKeys(request).find((k) => k.key.startsWith('visitor:'))
  return [
    ...attemptKeys(request, `signup:${account}`).filter((k) => !k.key.startsWith('hop:')),
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
// Only a keyed fingerprint of each code is stored, so the database alone does not give a code away.
const codeHash = (ticketHash: string, channel: 'email' | 'phone', code: string) => createHmac('sha256', process.env.JWT_SECRET!).update(`${ticketHash}:${channel}:${code}`).digest('hex')
const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const expiry = () => new Date(Date.now() + CODE_MINUTES * 60_000)
const ago = (ms: number) => new Date(Date.now() - ms)
const HOUR = 60 * 60_000

/**
 * Counts one more sending of codes to this email and phone. Returns what is over its limit (and then does not
 * count it), or null when the codes may go.
 */
async function overLimit(email: string, phone: string): Promise<'all' | 'phone' | 'email' | null> {
  const mine = await prisma.signupSend.create({ data: { email, phone } })
  const count = (where: { email?: string; phone?: string }, since: number) => prisma.signupSend.count({ where: { ...where, createdAt: { gt: ago(since) } } })
  const [all, phoneHour, phoneDay, emailHour, emailDay] = await Promise.all([count({}, HOUR), count({ phone }, HOUR), count({ phone }, 24 * HOUR), count({ email }, HOUR), count({ email }, 24 * HOUR)])
  const over = all > allSendsPerHour() ? 'all' : phoneHour > PHONE_SENDS.hour || phoneDay > PHONE_SENDS.day ? 'phone' : emailHour > EMAIL_SENDS.hour || emailDay > EMAIL_SENDS.day ? 'email' : null
  if (over) await prisma.signupSend.delete({ where: { id: mine.id } })
  return over
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
const NOT_SENT = 'We could not send your code. Check the email address and phone number, then try again.'
const UNAVAILABLE = 'Sign-up is unavailable right now. Please try again later.'
const TOO_MANY = { phone: 'Too many codes have been sent to this phone number. Please try again later.', email: 'Too many codes have been sent to this email address. Please try again later.' }
const EXPIRED = 'This sign-up has run out of time. Go back and start it again.'
const DEAD = 'Too many wrong codes. Ask for a new code and try again.'
const WRONG = {
  email: 'The code from your email is not right, or it has expired. Check it, or ask for a new code.',
  phone: 'The code from your text message is not right, or it has expired. Check it, or ask for a new code.',
  both: 'Those codes are not right, or they have expired. Check them, or ask for new codes.',
}

export async function signupRoutes(app: FastifyInstance) {
  // Something the server could not read (broken JSON, say) gets a plain message, on these routes only.
  app.setErrorHandler((error: { statusCode?: number }, request, reply) => {
    if (error.statusCode && error.statusCode < 500) return reply.code(400).send({ error: 'We could not read what was sent. Reload the page and try again.' })
    request.log.error(error, 'sign-up failed')
    return reply.code(503).send({ error: UNAVAILABLE })
  })

  // Is sign-up open, and which codes will be asked for? The sign-in page asks this before showing the form.
  app.get('/auth/signup', async () => ({ enabled: signupOpen(), needs: signupNeeds() }))

  // Step 1: the details. Saves them as a sign-up that is waiting and sends the codes. Everything here is the same
  // whether or not the email already has an account: its owner is told by email, and no code that would finish
  // the sign-up is ever sent, like forgot-password.
  app.post('/auth/signup', async (request, reply) => {
    if (!signupOpen()) return reply.code(404).send(NOT_FOUND)
    const parsed = StartSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: FIELD_ERRORS[String(parsed.error.issues[0]?.path[0])] ?? 'Fill in every field.' })
    const { name, schoolName, email, password, schoolType, framework } = parsed.data
    const phone = usablePhone(parsed.data.phone)
    if (!phone) return reply.code(400).send({ error: FIELD_ERRORS.phone })
    noteAddress(request)

    // Every request counts, so nobody can use this to flood an inbox or a phone with codes.
    const keys = requestKeys(request, email)
    const locked = lockedMessage(keys, 'sign-up requests')
    if (locked) return reply.code(429).send({ error: locked })
    recordFailure(keys)

    try {
      const passwordHash = await hash(password)
      const existing = await prisma.user.findUnique({ where: { email }, select: { name: true } })
      // Sign-ups that were never finished, and the record of what was sent, are cleared out after a day.
      await prisma.pendingSignup.deleteMany({ where: { createdAt: { lt: ago(24 * HOUR) } } })
      await prisma.signupSend.deleteMany({ where: { createdAt: { lt: ago(24 * HOUR) } } })
      const over = await overLimit(email, phone)
      if (over) return over === 'all' ? reply.code(503).send({ error: UNAVAILABLE }) : reply.code(429).send({ error: TOO_MANY[over] })

      const ticket = randomBytes(32).toString('base64url')
      const ticketHash = sha256(ticket)
      const codes = { email: newCode(), phone: newCode() }
      await prisma.pendingSignup.create({
        data: { ticketHash, email, phone, name, schoolName, schoolType, framework, passwordHash, emailCodeHash: codeHash(ticketHash, 'email', codes.email), phoneCodeHash: codeHash(ticketHash, 'phone', codes.phone), expiresAt: expiry() },
      })
      if (!(await sendSignupCodes({ name: existing?.name ?? name, email, phone }, codes, Boolean(existing)))) {
        await prisma.pendingSignup.deleteMany({ where: { ticketHash } })
        return reply.code(502).send({ error: NOT_SENT })
      }
      return { sent: true, ticket, needs: signupNeeds(), expiresInMinutes: CODE_MINUTES, resendInSeconds: RESEND_WAIT_SECONDS }
    } catch (error) {
      request.log.error(error, 'sign-up failed')
      return reply.code(503).send({ error: UNAVAILABLE })
    }
  })

  // New codes for a sign-up that is waiting: at most once a minute, within the limits above, and not while the
  // person is locked out for wrong codes. The old codes stop working.
  app.post('/auth/signup/resend', async (request, reply) => {
    if (!signupOpen()) return reply.code(404).send(NOT_FOUND)
    const parsed = z.object({ ticket: Ticket }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: EXPIRED })
    const ticketHash = sha256(parsed.data.ticket)
    const keys = requestKeys(request, ticketHash)
    const locked = lockedMessage(codeKeys(request, ticketHash), 'wrong codes') ?? lockedMessage(keys, 'sign-up requests')
    if (locked) return reply.code(429).send({ error: locked, waitSeconds: waitSeconds(locked) })
    recordFailure(keys)

    try {
      const pending = await prisma.pendingSignup.findUnique({ where: { ticketHash } })
      if (!pending) return reply.code(400).send({ error: EXPIRED })
      const wait = Math.ceil((pending.lastSentAt.getTime() + RESEND_WAIT_SECONDS * 1000 - Date.now()) / 1000)
      if (wait > 0) return reply.code(429).send({ error: `Please wait ${wait} ${wait === 1 ? 'second' : 'seconds'} before asking for another code.`, waitSeconds: wait })
      const over = await overLimit(pending.email, pending.phone)
      if (over) return over === 'all' ? reply.code(503).send({ error: UNAVAILABLE }) : reply.code(429).send({ error: TOO_MANY[over] })

      const codes = { email: newCode(), phone: newCode() }
      await prisma.pendingSignup.update({
        where: { id: pending.id },
        data: { emailCodeHash: codeHash(ticketHash, 'email', codes.email), phoneCodeHash: codeHash(ticketHash, 'phone', codes.phone), emailAttempts: 0, phoneAttempts: 0, lastSentAt: new Date(), expiresAt: expiry() },
      })
      const existing = await prisma.user.findUnique({ where: { email: pending.email }, select: { name: true } })
      if (!(await sendSignupCodes({ name: existing?.name ?? pending.name, email: pending.email, phone: pending.phone }, codes, Boolean(existing)))) return reply.code(502).send({ error: NOT_SENT })
      return { sent: true, needs: signupNeeds(), expiresInMinutes: CODE_MINUTES, resendInSeconds: RESEND_WAIT_SECONDS }
    } catch (error) {
      request.log.error(error, 'sign-up resend failed')
      return reply.code(503).send({ error: UNAVAILABLE })
    }
  })

  // Step 2: the codes. Every code asked for must be right (a text-message code that was not asked for is still
  // checked if it is given). Then the school and its administrator account are created and the person is signed
  // in, with the same reply as /auth/login. Five wrong tries at a code and it is dead; new ones must be asked for.
  app.post('/auth/signup/verify', async (request, reply) => {
    if (!signupOpen()) return reply.code(404).send(NOT_FOUND)
    const parsed = z.object({ ticket: Ticket, emailCode: Code.optional(), phoneCode: Code.optional() }).safeParse(request.body)
    const needs = signupNeeds()
    if (!parsed.success || (needs.email && !parsed.data.emailCode) || (needs.phone && !parsed.data.phoneCode)) {
      return reply.code(400).send({ error: needs.email && needs.phone ? 'Enter both 6-digit codes: the one from your email and the one from your text message.' : 'Enter the 6-digit code we sent you.' })
    }
    const { emailCode, phoneCode } = parsed.data
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
      if (!pending) return refuse(EXPIRED)
      // Each try is counted before the codes are looked at, so several tries sent at once cannot get past the limit.
      const counted = await prisma.pendingSignup.updateMany({
        where: { id: pending.id, expiresAt: { gt: new Date() }, ...(emailCode ? { emailAttempts: { lt: MAX_WRONG_CODES } } : {}), ...(phoneCode ? { phoneAttempts: { lt: MAX_WRONG_CODES } } : {}) },
        data: { ...(emailCode ? { emailAttempts: { increment: 1 } } : {}), ...(phoneCode ? { phoneAttempts: { increment: 1 } } : {}) },
      })
      const emailWrong = Boolean(emailCode) && !sameHash(pending.emailCodeHash, codeHash(ticketHash, 'email', emailCode!))
      const phoneWrong = Boolean(phoneCode) && !sameHash(pending.phoneCodeHash, codeHash(ticketHash, 'phone', phoneCode!))
      if (!counted.count) {
        const dead = pending.expiresAt > new Date()
        return refuse(dead ? DEAD : emailCode && phoneCode ? WRONG.both : emailCode ? WRONG.email : WRONG.phone)
      }
      if (emailWrong || phoneWrong) {
        const dead = (emailWrong && pending.emailAttempts + 1 >= MAX_WRONG_CODES) || (phoneWrong && pending.phoneAttempts + 1 >= MAX_WRONG_CODES)
        return refuse(dead ? DEAD : emailWrong && phoneWrong ? WRONG.both : emailWrong ? WRONG.email : WRONG.phone)
      }

      // The email already has an account (its owner was told by email, and was sent no code). Nothing is created,
      // and the reply is the one for a wrong code. (Only on a developer's computer, where the code is in the console.)
      if (await prisma.user.findUnique({ where: { email: pending.email }, select: { id: true } })) {
        await prisma.pendingSignup.deleteMany({ where: { id: pending.id } })
        return refuse(emailCode ? WRONG.email : WRONG.phone)
      }
      const user = await prisma.$transaction(async (tx) => {
        const school = await tx.school.create({ data: { name: pending.schoolName, type: pending.schoolType, framework: pending.framework } })
        const created = await tx.user.create({
          data: { schoolId: school.id, name: pending.name, email: pending.email, phone: pending.phone, role: 'admin', status: 'active', passwordHash: pending.passwordHash, lastActiveAt: new Date() },
        })
        // Other sign-ups waiting for the same email can no longer be finished.
        await tx.pendingSignup.deleteMany({ where: { email: pending.email } })
        return created
      })
      request.log.info({ account: maskEmail(user.email) }, 'sign-up finished: new school and administrator created')
      return { token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } }
    } catch (error) {
      // P2002: the email got an account at the same moment, some other way.
      if ((error as { code?: string }).code === 'P2002') return refuse(emailCode ? WRONG.email : WRONG.phone)
      request.log.error(error, 'sign-up verify failed')
      return reply.code(503).send({ error: UNAVAILABLE })
    }
  })
}
