import type { Teacher } from '../types'

/** Teachers, loaded from the backend after sign-in (lib/liveData.ts): the full staff list for administrators, class teachers otherwise. */
export const TEACHERS: Teacher[] = []

export function getTeacher(id: string): Teacher | undefined {
  return TEACHERS.find((t) => t.id === id)
}
