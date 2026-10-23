/**
 * Scoped read helpers over the loaded data. These mirror the queries the future
 * API will answer (e.g. "students taught by this teacher").
 */
import type { Role } from '../types'
import { ASSESSMENTS } from './assessments'
import { CLASSES } from './classes'
import { DIAGNOSTIC_REPORTS } from './diagnostics'
import { GUIDANCE_PLANS } from './guidance'
import { STUDENTS } from './students'
import { liveState } from './liveState'
import { ROLE_USERS } from './users'

/** Classes visible to the signed-in user (teacher: own classes; admin: all). Data from the backend is already scoped. */
export function classesInScope(role: Role) {
  if (liveState.active) return CLASSES
  return role === 'teacher' ? CLASSES.filter((c) => c.teacherId === ROLE_USERS.teacher.id) : CLASSES
}

export function classIdsInScope(role: Role): Set<string> {
  return new Set(classesInScope(role).map((c) => c.id))
}

export function studentsInScope(role: Role) {
  const ids = classIdsInScope(role)
  return STUDENTS.filter((s) => ids.has(s.classId))
}

export function assessmentsInScope(role: Role) {
  const ids = classIdsInScope(role)
  return ASSESSMENTS.filter((a) => ids.has(a.classId))
}

export function guidanceInScope(role: Role) {
  const ids = new Set(studentsInScope(role).map((s) => s.id))
  return GUIDANCE_PLANS.filter((g) => ids.has(g.studentId))
}

export function diagnosticsInScope(role: Role) {
  const ids = new Set(studentsInScope(role).map((s) => s.id))
  return DIAGNOSTIC_REPORTS.filter((d) => ids.has(d.studentId))
}

/** Aggregated competency gaps across a set of classes. */
export function commonGapsInScope(role: Role) {
  const totals = new Map<string, { competency: string; subject: string; studentsAffected: number }>()
  for (const c of classesInScope(role)) {
    for (const g of c.commonGaps) {
      const prev = totals.get(g.competency)
      totals.set(g.competency, { ...g, studentsAffected: (prev?.studentsAffected ?? 0) + g.studentsAffected })
    }
  }
  return [...totals.values()].sort((a, b) => b.studentsAffected - a.studentsAffected)
}
