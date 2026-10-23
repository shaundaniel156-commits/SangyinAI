import type { SessionUser } from '../auth/session.ts'
import type { Prisma } from '../generated/prisma/client.ts'

// The two rules every route follows: only the user's own school, and parents only see children
// linked to them (StudentGuardian). Routes add these filters to every query, so a record outside
// the user's reach simply isn't found (404) rather than revealing that it exists.

// Classes a user may see: every class in an admin's school, or the classes a teacher leads or teaches a subject in.
export function classScope(user: SessionUser): Prisma.SchoolClassWhereInput {
  if (user.role === 'admin') return { schoolId: user.schoolId }
  if (user.role === 'teacher') return { schoolId: user.schoolId, OR: [{ teacherId: user.sub }, { teachers: { some: { id: user.sub } } }] }
  return { id: { in: [] } }
}

// Students a user may see.
export function studentScope(user: SessionUser): Prisma.StudentWhereInput {
  switch (user.role) {
    case 'admin':
      return { schoolId: user.schoolId }
    case 'teacher':
      return { schoolId: user.schoolId, class: classScope(user) }
    case 'parent':
      return { schoolId: user.schoolId, guardians: { some: { guardianId: user.sub } } }
    case 'student':
      return { schoolId: user.schoolId, userId: user.sub }
  }
}

// Assessments a user may see: those of their classes (staff), or of the classes their children / they are in (parents, students).
export function assessmentScope(user: SessionUser): Prisma.AssessmentWhereInput {
  if (user.role === 'admin' || user.role === 'teacher') return { class: classScope(user) }
  return { class: { students: { some: studentScope(user) } } }
}

// AI assessments a user may see and change: a teacher's own drafts, or every one in an admin's school.
export function aiAssessmentScope(user: SessionUser): Prisma.AiAssessmentWhereInput {
  if (user.role === 'admin') return { class: { schoolId: user.schoolId } }
  return { createdById: user.sub, class: { schoolId: user.schoolId } }
}
