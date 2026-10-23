/**
 * Students, loaded from the backend after sign-in (lib/liveData.ts fills these lists in place).
 * They start empty: there is no sample data.
 */
import type { Student, Subject } from '../types'

/** Competencies that appear in the loaded students' records (filled by lib/liveData.ts). */
export const COMPETENCIES: { id: string; name: string; topic: string; subject: Subject }[] = []

export const STUDENTS: Student[] = []

export function getStudent(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id)
}

export function getStudentsByClass(classId: string): Student[] {
  return STUDENTS.filter((s) => s.classId === classId)
}

/** A parent's linked children (filled by lib/liveData.ts). */
export const PARENT_CHILD_IDS: string[] = []
