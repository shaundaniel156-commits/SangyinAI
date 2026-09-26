import type { Role, UserProfile } from '../types'

/**
 * DEMO DATA — one sample signed-in user per role.
 * Used by the demo login/role switcher. No real authentication exists yet.
 */
export const DEMO_USERS: Record<Role, UserProfile> = {
  teacher: {
    id: 't-01',
    name: 'Demo Teacher',
    email: 'teacher@demo-school.example',
    role: 'teacher',
    title: 'Mathematics Teacher',
    initials: 'DT',
  },
  admin: {
    id: 'a-01',
    name: 'Demo Administrator',
    email: 'admin@demo-school.example',
    role: 'admin',
    title: 'School Administrator',
    initials: 'DA',
  },
  parent: {
    id: 'p-01',
    name: 'Demo Parent',
    email: 'parent@demo.example',
    role: 'parent',
    title: 'Parent / Guardian',
    initials: 'DP',
  },
  student: {
    id: 's-001',
    name: 'Demo Student 01',
    email: 'student01@demo-school.example',
    role: 'student',
    title: 'Primary 6 learner',
    initials: '01',
  },
}

export const ROLE_LABEL: Record<Role, string> = {
  teacher: 'Teacher',
  admin: 'School Administrator',
  parent: 'Parent',
  student: 'Student',
}

/** Landing route after (demo) sign-in for each role. */
export const ROLE_HOME: Record<Role, string> = {
  teacher: '/dashboard',
  admin: '/dashboard',
  parent: '/parent/dashboard',
  student: '/student/dashboard',
}
