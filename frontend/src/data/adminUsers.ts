/**
 * DEMO DATA — sample user accounts listed on the administrator's Users page.
 * Not real people. Teacher rows are derived from TEACHERS so every screen stays
 * consistent; the rest are placeholder parent, student and admin accounts.
 */
import type { Role } from '../types'
import { TEACHERS } from './teachers'
import { DEMO_USERS } from './users'

export type AccountStatus = 'active' | 'invited' | 'inactive'

export interface UserAccount {
  id: string
  name: string
  initials: string
  email: string
  role: Role
  status: AccountStatus
  /** Short context line, e.g. linked class or child. */
  detail: string
  lastActive: string
}

export const USER_ACCOUNTS: UserAccount[] = [
  {
    id: DEMO_USERS.admin.id,
    name: DEMO_USERS.admin.name,
    initials: DEMO_USERS.admin.initials,
    email: DEMO_USERS.admin.email,
    role: 'admin',
    status: 'active',
    detail: 'Demo School',
    lastActive: 'Today',
  },
  ...TEACHERS.map<UserAccount>((t) => ({
    id: t.id,
    name: t.name,
    initials: t.initials,
    email: t.email,
    role: 'teacher',
    status: t.status,
    detail: t.subjects.join(', '),
    lastActive: t.lastActive,
  })),
  { id: 'p-01', name: 'Demo Parent', initials: 'DP', email: 'parent@demo.example', role: 'parent', status: 'active', detail: 'Linked to Demo Student 01, Demo Student 40', lastActive: 'Today' },
  { id: 'p-02', name: 'Demo Parent 02', initials: '02', email: 'parent02@demo.example', role: 'parent', status: 'active', detail: 'Linked to Demo Student 02', lastActive: '2 days ago' },
  { id: 'p-03', name: 'Demo Parent 03', initials: '03', email: 'parent03@demo.example', role: 'parent', status: 'invited', detail: 'Linked to Demo Student 03', lastActive: '—' },
  { id: 'p-04', name: 'Demo Parent 04', initials: '04', email: 'parent04@demo.example', role: 'parent', status: 'inactive', detail: 'Linked to Demo Student 04', lastActive: '1 month ago' },
  { id: 's-001', name: 'Demo Student 01', initials: '01', email: 'student01@demo-school.example', role: 'student', status: 'active', detail: 'P6 A (Sample Class)', lastActive: 'Today' },
  { id: 's-002', name: 'Demo Student 02', initials: '02', email: 'student02@demo-school.example', role: 'student', status: 'active', detail: 'P6 A (Sample Class)', lastActive: 'Yesterday' },
  { id: 's-003', name: 'Demo Student 03', initials: '03', email: 'student03@demo-school.example', role: 'student', status: 'invited', detail: 'P6 A (Sample Class)', lastActive: '—' },
  { id: 's-040', name: 'Demo Student 40', initials: '40', email: 'student40@demo-school.example', role: 'student', status: 'active', detail: 'P7 A (Sample Class)', lastActive: '3 days ago' },
]
