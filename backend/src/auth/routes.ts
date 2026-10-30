import { createHash, randomBytes } from 'node:crypto'
import { hash, verify } from '@node-rs/argon2'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.ts'
import { sendPasswordReset } from '../messaging/messages.ts'
import { authConfigured, requireUser, signToken } from './session.ts'

const LoginSchema = z.object({
  email: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
  // The school level and curriculum picked before signing in. Only an administrator's choice is saved to the school.
  school: z.object({ type: z.enum(['primary', 'secondary']), framework: z.enum(['uganda', 'cambridge']) }).optional(),
})

export async function authRoutes(app: FastifyInstance) {
  // Sign-in: checks the email and password against the User table and returns a token.
  // Limited to 10 tries per 15 minutes to slow password guessing.
  app.post('/auth/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    if (!authConfigured()) return reply.code(503).send({ error: 'Sign-in is not set up on the server. Add JWT_SECRET to backend/.env.' })
    const parsed = LoginSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Enter your email and password.' })

    let user
    try {
      user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    } catch (error) {
      request.log.error(error, 'sign-in: database unreachable')
      return reply.code(503).send({ error: 'Sign-in is unavailable right now. Please try again shortly.' })
    }
    const ok = user?.passwordHash && user.status === 'active' && (await verify(user.passwordHash, parsed.data.password))
    if (!user || !ok) return reply.code(401).send({ error: 'Wrong email or password.' })

    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
    if (user.role === 'admin' && parsed.data.school) await prisma.school.update({ where: { id: user.schoolId }, data: parsed.data.school })
    return {
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }
  })

  // Change your own password (e.g. after signing in with a one-time password).
  app.post('/auth/change-password', { onRequest: requireUser, config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(8).max(200) }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'The new password must be at least 8 characters.' })
    const user = await prisma.user.findUnique({ where: { id: request.user!.sub } })
    if (!user?.passwordHash || !(await verify(user.passwordHash, parsed.data.currentPassword))) return reply.code(401).send({ error: 'Your current password is not right.' })
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(parsed.data.newPassword) } })
    return { changed: true }
  })

  // Forgot password: emails a single-use reset link that expires in 30 minutes. Always gives the same reply,
  // so nobody can use this to find out which emails have accounts.
  app.post('/auth/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = z.object({ email: z.string().trim().min(3).max(200) }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Enter your email address.' })
    const done = { sent: true, message: 'If that email has an account, a reset link is on its way. It expires in 30 minutes.' }
    try {
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
      if (!user || user.status !== 'active') return done
      const token = randomBytes(32).toString('base64url')
      await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } })
      await prisma.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) } })
      void sendPasswordReset(user, token)
    } catch (error) {
      request.log.error(error, 'forgot-password failed')
      return reply.code(503).send({ error: 'Password reset is unavailable right now. Please try again shortly.' })
    }
    return done
  })

  // Sets a new password with a reset link's token. Each link works once.
  app.post('/auth/reset-password', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = z.object({ token: z.string().min(20).max(200), newPassword: z.string().min(8).max(200) }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'The new password must be at least 8 characters.' })
    const reset = await prisma.passwordReset.findUnique({ where: { tokenHash: sha256(parsed.data.token) } })
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return reply.code(400).send({ error: 'This reset link has expired or was already used. Ask for a new one.' })
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await hash(parsed.data.newPassword) } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ])
    return { changed: true }
  })

  // Your email/SMS preferences for updates and notification copies.
  app.get('/auth/preferences', { onRequest: requireUser }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.user!.sub } })
    return { emailNotifications: user.emailNotifications, smsNotifications: user.smsNotifications, phone: user.phone }
  })
  app.patch('/auth/preferences', { onRequest: requireUser }, async (request, reply) => {
    const parsed = z.object({ emailNotifications: z.boolean().optional(), smsNotifications: z.boolean().optional() }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid preferences.' })
    const user = await prisma.user.update({ where: { id: request.user!.sub }, data: parsed.data })
    return { emailNotifications: user.emailNotifications, smsNotifications: user.smsNotifications, phone: user.phone }
  })

  // The signed-in person's school (name shown in the sidebar, reports and settings).
  app.get('/school', { onRequest: requireUser }, async (request) => {
    const s = await prisma.school.findUniqueOrThrow({ where: { id: request.user!.schoolId } })
    return { id: s.id, name: s.name, district: s.district, type: s.type, framework: s.framework }
  })

  // Who am I? Lets the frontend check that a saved token is still valid.
  app.get('/auth/me', { onRequest: requireUser }, async (request) => request.user)
}

const RESET_MINUTES = 30
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
