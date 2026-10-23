import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'

export type Role = 'teacher' | 'admin' | 'parent' | 'student'

// Who is making the request, read from their sign-in token.
export interface SessionUser {
  sub: string
  role: Role
  name: string
  schoolId: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser
  }
}

// True when JWT_SECRET is set. Without it, tokens can't be made or checked.
export function authConfigured(): boolean {
  return Boolean(process.env.JWT_SECRET)
}

// A signed token the frontend sends back with every request. Expires after 8 hours (one school day).
export function signToken(user: Omit<SessionUser, 'sub'> & { id: string }): string {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name, schoolId: user.schoolId }, process.env.JWT_SECRET!, { expiresIn: '8h' })
}

// Route guard: lets a request through only with a valid token for one of the given roles.
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.replace(/^Bearer /, '') ?? ''
    let user: SessionUser
    try {
      user = jwt.verify(token, process.env.JWT_SECRET ?? '') as SessionUser
    } catch {
      return reply.code(401).send({ error: 'Please sign in again.' })
    }
    if (!roles.includes(user.role)) {
      return reply.code(403).send({ error: 'Your account cannot use this feature.' })
    }
    request.user = user
  }
}

// Any signed-in user.
export const requireUser = requireRole('teacher', 'admin', 'parent', 'student')
