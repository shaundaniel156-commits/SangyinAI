/**
 * Loads the signed-in user's data from the backend into the lists the pages read (src/data/*), replacing
 * their contents in place. If anything fails, nothing is swapped in. Called by LiveDataProvider after
 * sign-in and by refresh().
 */
import { USER_ACCOUNTS, type UserAccount } from '../data/adminUsers'
import { AI_QUESTION_BANK, type QuestionBank } from '../data/aiQuestionBank'
import { ASSESSMENTS, LIVE_RESULTS } from '../data/assessments'
import { CLASSES } from '../data/classes'
import { CURRICULUM_FRAMEWORKS } from '../data/curriculum'
import { DIAGNOSTIC_REPORTS } from '../data/diagnostics'
import { GUIDANCE_PLANS } from '../data/guidance'
import { liveState } from '../data/liveState'
import { NOTIFICATIONS } from '../data/notifications'
import { deriveFromLoadedData } from '../data/performance'
import { PRACTICE_ACTIVITIES } from '../data/practice'
import { SCHOOL } from '../data/school'
import { COMPETENCIES, PARENT_CHILD_IDS, STUDENTS } from '../data/students'
import { TEACHERS } from '../data/teachers'
import { ROLE_USERS } from '../data/users'
import type { AiAssessment, AppNotification, CurriculumFramework, CurriculumFrameworkData, Assessment, AssessmentResult, DiagnosticReport, GuidancePlan, PracticeActivity, Role, SchoolClass, Student, Teacher } from '../types'
import { api, getAuthProfile } from './api'

/** AI assessments loaded for the signed-in user; AiAssessmentsContext starts from these. */
export const LIVE_AI_ASSESSMENTS: AiAssessment[] = []

// The built-in question bank as shipped, so a reload adds the school's questions to it only once.
const BUILT_IN_BANK: Record<string, QuestionBank[]> = Object.fromEntries(Object.entries(AI_QUESTION_BANK).map(([k, v]) => [k, [...v]]))

function replace<T>(list: T[], items: T[]) {
  list.splice(0, list.length, ...items)
}

interface StaffRow { id: string; name: string; email: string; role: string; status: Teacher['status']; subjects: string[]; classes: string[]; lastActiveAt: string | null }
interface AccountRow { id: string; name: string; email: string; role: Role; status: UserAccount['status']; detail: string; lastActiveAt: string | null }
const SCHOOL_TYPE: Record<string, string> = { primary: 'Primary school', secondary: 'Secondary school', university: 'University', mixed: 'Primary & secondary' }

const initials = (name: string) => {
  const w = name.trim().split(/\s+/)
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? (w.at(-1)?.[0] ?? '') : '')).toUpperCase()
}
const lastActive = (iso: string | null) => {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : new Date(iso).toLocaleDateString()
}

export async function loadLiveData(role: Role): Promise<void> {
  const staff = role === 'teacher' || role === 'admin'
  const [school, classes, students, assessments, guidance, notifications, aiAssessments, curriculum, diagnostics] = await Promise.all([
    api<{ name: string; district: string | null; type: string; framework: CurriculumFramework }>('/school'),
    api<SchoolClass[]>('/classes'),
    api<Student[]>('/students'),
    api<Assessment[]>('/assessments'),
    api<GuidancePlan[]>('/guidance'),
    api<AppNotification[]>('/notifications'),
    api<AiAssessment[]>('/ai/assessments'),
    api<CurriculumFrameworkData[]>('/curriculum'),
    staff ? api<DiagnosticReport[]>('/diagnostics') : Promise.resolve(null),
  ])
  // The school's own reviewed questions (staff only): used first for "Regenerate" and offline drafts.
  const schoolBank = staff ? await api<(QuestionBank & { id: string; competency: string })[]>('/feed/questions') : []
  // Administrators: the full staff list and every account (Teachers and Users pages, usage figures).
  const [staffList, accounts] = role === 'admin' ? await Promise.all([api<StaffRow[]>('/feed/staff'), api<AccountRow[]>('/feed/users')]) : [null, null]
  const results = await Promise.all(assessments.map((a) => api<AssessmentResult[]>(`/assessments/${a.id}/results`).then((r) => [a.id, r] as const)))

  // Practice: the student's own list, or a parent's first child's.
  const practice =
    role === 'student' ? await api<PracticeActivity[]>('/me/practice')
    : role === 'parent' && students[0] ? await api<PracticeActivity[]>(`/students/${students[0].id}/practice`)
    : null

  // Everything loaded: swap it in.
  Object.assign(SCHOOL, {
    name: school.name,
    location: school.district ?? '',
    type: SCHOOL_TYPE[school.type] ?? school.type,
    level: school.type,
    primaryFramework: school.framework,
  })
  replace(CLASSES, classes)
  replace(STUDENTS, students)
  replace(ASSESSMENTS, assessments)
  LIVE_RESULTS.clear()
  for (const [id, r] of results) LIVE_RESULTS.set(id, r)
  replace(GUIDANCE_PLANS, guidance)
  replace(NOTIFICATIONS, notifications)
  replace(LIVE_AI_ASSESSMENTS, aiAssessments)
  replace(CURRICULUM_FRAMEWORKS, curriculum)
  for (const key of Object.keys(AI_QUESTION_BANK)) if (!(key in BUILT_IN_BANK)) delete AI_QUESTION_BANK[key]
  for (const [key, list] of Object.entries(BUILT_IN_BANK)) AI_QUESTION_BANK[key] = [...list]
  for (const q of schoolBank) {
    const { id, competency, type, difficulty, prompt, options, answer, explanation } = q
    ;(AI_QUESTION_BANK[competency] ??= []).unshift({ sourceId: `bank-${id}`, type, difficulty, prompt, ...(type === 'multiple_choice' ? { options } : {}), answer, explanation })
  }
  if (diagnostics) replace(DIAGNOSTIC_REPORTS, diagnostics)
  if (practice) replace(PRACTICE_ACTIVITIES, practice)

  // Competencies found in the students' records, for filters and reports.
  const competencies = new Map<string, (typeof COMPETENCIES)[number]>()
  for (const st of students) for (const c of st.competencies) if (!competencies.has(c.competencyId)) competencies.set(c.competencyId, { id: c.competencyId, name: c.name, topic: c.topic, subject: c.subject })
  replace(COMPETENCIES, [...competencies.values()])

  // Teachers: the staff list for administrators; otherwise the class teachers named on the loaded classes.
  const classIdByName = new Map(classes.map((c) => [c.name, c.id]))
  const classTeachers = [...new Map(classes.filter((c) => c.teacherId && c.teacherName).map((c) => [c.teacherId, c])).values()]
  replace(
    TEACHERS,
    staffList
      ? staffList
          .filter((t) => t.role === 'teacher')
          .map((t) => ({ id: t.id, name: t.name, initials: initials(t.name), email: t.email, subjects: t.subjects, classIds: t.classes.map((n) => classIdByName.get(n)).filter((id): id is string => !!id), status: t.status, lastActive: lastActive(t.lastActiveAt) }))
      : classTeachers.map((c) => ({ id: c.teacherId, name: c.teacherName!, initials: initials(c.teacherName!), email: '', subjects: c.subjects, classIds: classes.filter((k) => k.teacherId === c.teacherId).map((k) => k.id), status: 'active' as const, lastActive: '—' })),
  )
  replace(
    USER_ACCOUNTS,
    (accounts ?? []).map((u) => ({ id: u.id, name: u.name, initials: initials(u.name), email: u.email, role: u.role, status: u.status, detail: u.detail, lastActive: lastActive(u.lastActiveAt), ...(u.lastActiveAt ? { lastActiveAt: u.lastActiveAt } : {}) })),
  )

  // The signed-in account for this role; parents and students get their own children / record.
  const profile = getAuthProfile()
  if (profile) Object.assign(ROLE_USERS[role], { id: profile.id, name: profile.name, email: profile.email })
  if (role === 'student' && students[0]) ROLE_USERS.student.id = students[0].id
  if (role === 'parent') replace(PARENT_CHILD_IDS, students.map((s) => s.id))

  deriveFromLoadedData()
  liveState.active = true
  liveState.loadedAt = new Date()
}
