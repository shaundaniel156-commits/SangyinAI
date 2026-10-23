import type { Role, UserProfile } from '../types'

/**
 * The signed-in account, per role (SessionContext and lib/liveData.ts fill in the name, email and id after sign-in).
 * For a student, `id` becomes their student record's id.
 */
export const ROLE_USERS: Record<Role, UserProfile> = {
  teacher: { id: '', name: '', email: '', role: 'teacher', title: 'Teacher', initials: '' },
  admin: { id: '', name: '', email: '', role: 'admin', title: 'School Administrator', initials: '' },
  parent: { id: '', name: '', email: '', role: 'parent', title: 'Parent / Guardian', initials: '' },
  student: { id: '', name: '', email: '', role: 'student', title: 'Learner', initials: '' },
}

export const ROLE_LABEL: Record<Role, string> = {
  teacher: 'Teacher',
  admin: 'School Administrator',
  parent: 'Parent',
  student: 'Student',
}

/** Landing route after sign-in for each role. */
export const ROLE_HOME: Record<Role, string> = {
  teacher: '/dashboard',
  admin: '/dashboard',
  parent: '/parent/dashboard',
  student: '/student/dashboard',
}
