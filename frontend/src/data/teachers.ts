import type { Teacher } from '../types'

/** DEMO DATA — sample teacher accounts. Not real people. */
export const TEACHERS: Teacher[] = [
  { id: 't-01', name: 'Demo Teacher', initials: 'DT', email: 'teacher@demo-school.example', subjects: ['Mathematics'], classIds: ['c-p6a', 'c-p7a', 'c-s1b'], status: 'active', lastActive: 'Today' },
  { id: 't-02', name: 'Demo Teacher 2', initials: 'T2', email: 'teacher2@demo-school.example', subjects: ['Mathematics', 'Science'], classIds: ['c-st7'], status: 'active', lastActive: 'Yesterday' },
  { id: 't-03', name: 'Demo Teacher 3', initials: 'T3', email: 'teacher3@demo-school.example', subjects: ['English'], classIds: ['c-p6a', 'c-p7a'], status: 'active', lastActive: '2 days ago' },
  { id: 't-04', name: 'Demo Teacher 4', initials: 'T4', email: 'teacher4@demo-school.example', subjects: ['Science', 'Social Studies'], classIds: ['c-s1b'], status: 'invited', lastActive: '—' },
  { id: 't-05', name: 'Demo Teacher 5', initials: 'T5', email: 'teacher5@demo-school.example', subjects: ['English'], classIds: ['c-st7'], status: 'inactive', lastActive: '3 weeks ago' },
]

export function getTeacher(id: string): Teacher | undefined {
  return TEACHERS.find((t) => t.id === id)
}
