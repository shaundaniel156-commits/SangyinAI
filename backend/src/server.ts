import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyRequest } from 'fastify'
import { aiConfigured, MODEL } from './ai/client.ts'
import { generateAssessment } from './ai/generateAssessment.ts'
import { GuidanceRequestSchema, generateGuidance } from './ai/guidance.ts'
import { GenerateAssessmentRequestSchema } from './ai/schemas.ts'
import { authConfigured, requireRole } from './auth/session.ts'
import { authRoutes } from './auth/routes.ts'
import { databaseReachable } from './db/client.ts'
import { aiAssessmentRoutes } from './routes/aiAssessments.ts'
import { assessmentRoutes } from './routes/assessments.ts'
import { classRoutes } from './routes/classes.ts'
import { curriculumRoutes } from './routes/curriculum.ts'
import { feedRoutes } from './routes/feed.ts'
import { guidanceRoutes } from './routes/guidance.ts'
import { notificationRoutes } from './routes/notifications.ts'
import { practiceRoutes } from './routes/practice.ts'
import { studentRoutes } from './routes/students.ts'

// trustProxy: behind Railway's proxy, use the visitor's real address (rate limits are per visitor, not shared).
const app = Fastify({ logger: true, trustProxy: true })

// Allow the frontend to call this server. Several addresses can be listed, separated by commas.
const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim())
await app.register(cors, { origin: origins })

// Limits are set per route (below), so nothing is limited unless a route asks for it.
await app.register(rateLimit, {
  global: false,
  errorResponseBuilder: (_request, context) => ({
    statusCode: 429,
    error: 'Too many requests',
    message: `You have reached the limit. Try again in ${context.after}.`,
  }),
})

// File uploads (Import Results, Manual feed): one file of up to 10 MB at a time.
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } })

if (!authConfigured()) {
  app.log.warn('Sign-in is not set up: add JWT_SECRET to backend/.env. Every signed-in route will refuse requests until then.')
}

// Only signed-in teachers and admins may use the AI, each up to 20 drafts per hour.
const aiRoute = {
  onRequest: requireRole('teacher', 'admin'),
  config: {
    // Counted per teacher, after the sign-in check has identified them.
    rateLimit: { max: 20, timeWindow: '1 hour', hook: 'preHandler' as const, keyGenerator: (request: FastifyRequest) => request.user?.sub ?? request.ip },
  },
}

// Health check: is the server up, and are the AI, sign-in and database ready?
app.get('/health', async () => ({
  ok: true,
  ai: aiConfigured() ? MODEL : 'offline',
  signIn: authConfigured() ? 'ready' : 'not set up',
  database: (await databaseReachable()) ? 'connected' : 'unreachable',
}))

// Sign-in, then the data routes. Each checks who is signed in and only returns their school's data.
await app.register(authRoutes)
await app.register(classRoutes)
await app.register(studentRoutes)
await app.register(assessmentRoutes)
await app.register(aiAssessmentRoutes)
await app.register(guidanceRoutes)
await app.register(practiceRoutes)
await app.register(notificationRoutes)
await app.register(curriculumRoutes)
await app.register(feedRoutes)

// The AI Assessment Builder calls this when a teacher presses "Generate draft".
app.post('/ai/assessments/generate', aiRoute, async (request, reply) => {
  const parsed = GenerateAssessmentRequestSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid request', issues: parsed.error.issues })
  }
  return generateAssessment(parsed.data, request.user?.schoolId)
})

// AI Guidance: a teaching plan (teacher sheet, parent note, student sequence) for one gap.
app.post('/ai/guidance/generate', aiRoute, async (request, reply) => {
  const parsed = GuidanceRequestSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid request', issues: parsed.error.issues })
  }
  return generateGuidance(parsed.data, request.user?.schoolId)
})

// 0.0.0.0 = accept connections from outside this machine (needed on Railway, which sets PORT).
await app.listen({ port: Number(process.env.PORT ?? 4000), host: '0.0.0.0' })
