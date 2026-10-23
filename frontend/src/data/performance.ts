/**
 * Performance figures for the charts and dashboards, worked out from the loaded data (no sample values).
 * The lists and objects below are refilled in place by deriveFromLoadedData() after each load (lib/liveData.ts).
 */
import type { ActivityItem, SeriesPoint, Subject } from '../types'
import { ADMIN_ACTIVITY, TEACHER_ACTIVITY } from './activity'
import { USER_ACCOUNTS } from './adminUsers'
import { ASSESSMENTS, getAssessmentResults, getAssessmentsByClass, getStudentAssessmentHistory } from './assessments'
import { CLASSES } from './classes'
import { GUIDANCE_PLANS } from './guidance'
import { STUDENTS } from './students'
import type { Assessment } from '../types'

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_MS = 7 * 864e5

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)
const label = (date: string) => {
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? date : `${d.getDate()} ${MONTH[d.getMonth()]}`
}

/** The class average (%) of one assessment, from its recorded scores; null if none are recorded. */
function assessmentAverage(a: Assessment): number | null {
  const scores = getAssessmentResults(a).map((r) => r.score).filter((v): v is number => v !== null)
  return scores.length ? Math.round((mean(scores) / a.maxScore) * 100) : null
}

/** Class average (%) per assessment with recorded scores, oldest first. */
export function getClassTrend(classId: string): SeriesPoint[] {
  return getAssessmentsByClass(classId)
    .filter((a) => a.scoresEntered > 0)
    .sort((x, y) => x.date.localeCompare(y.date))
    .flatMap((a) => {
      const value = assessmentAverage(a)
      return value === null ? [] : [{ label: label(a.date), value }]
    })
}

/** A student's result (%) per assessment with a recorded score, oldest first. */
export function getStudentTrend(studentId: string, classId: string): SeriesPoint[] {
  return getStudentAssessmentHistory(studentId, classId)
    .filter((h) => h.percent !== null)
    .reverse()
    .map((h) => ({ label: label(h.assessment.date), value: h.percent! }))
}

/** Average mastery (%) per subject across all loaded students. */
export const SUBJECT_AVERAGES: { subject: Subject; value: number }[] = []

/** School-wide average (%) per month, from every assessment with recorded scores. */
export const SCHOOL_TREND: SeriesPoint[] = []

/** System usage this week, from the accounts' last sign-in (administrators only). */
export const USAGE_INDICATORS = {
  activeTeachers: { value: 0, total: 0 },
  activeParents: { value: 0, total: 0 },
  guidanceReviewed: 0,
  assessmentsRecorded: 0,
  /** Accounts whose most recent sign-in fell on each of the last seven days. */
  signInsByDay: [] as SeriesPoint[],
}

/**
 * Pilot-phase success criteria from the project document. Progress is not measured yet, so each shows its status;
 * add `value`/`goal` (percentages) once a measurement exists.
 */
export const PILOT_CRITERIA: {
  metric: string
  target: string
  measurement: string
  value?: number
  goal?: number
  status?: string
}[] = [
  { metric: 'Improvement in targeted competency scores', target: '≥ 15% average uplift', measurement: 'Pre/post assessment comparison', status: 'Not measured yet' },
  { metric: 'Teacher adoption (active weekly use)', target: '≥ 70% of pilot teachers', measurement: 'System usage logs', status: 'Not measured yet' },
  { metric: 'Parent engagement with progress view', target: '≥ 50% of pilot households', measurement: 'App/SMS engagement logs', status: 'Not measured yet' },
  { metric: 'System availability offline', target: 'Core features fully functional offline', measurement: 'Field testing at low-connectivity sites', status: 'Not measured yet' },
  { metric: 'Curriculum alignment accuracy', target: '100% mapped to NCDC/Cambridge objectives', measurement: 'Curriculum audit review', status: 'Not measured yet' },
]

/** Data completeness, from the loaded records. */
export const DATA_QUALITY: { label: string; value: number; total: number; tone: 'good' | 'warn' }[] = []

function replace<T>(list: T[], items: T[]) {
  list.splice(0, list.length, ...items)
}

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : label(iso)
}

/** Refills the figures above from the data that was just loaded. */
export function deriveFromLoadedData(): void {
  const subjects = new Map<Subject, number[]>()
  for (const s of STUDENTS) for (const c of s.competencies) subjects.set(c.subject, [...(subjects.get(c.subject) ?? []), c.score])
  replace(SUBJECT_AVERAGES, [...subjects].map(([subject, scores]) => ({ subject, value: mean(scores) })))

  const months = new Map<string, number[]>()
  for (const a of [...ASSESSMENTS].sort((x, y) => x.date.localeCompare(y.date))) {
    const value = assessmentAverage(a)
    const d = new Date(a.date)
    if (value !== null && !Number.isNaN(d.getTime())) {
      const key = `${MONTH[d.getMonth()]} ${d.getFullYear()}`
      months.set(key, [...(months.get(key) ?? []), value])
    }
  }
  replace(SCHOOL_TREND, [...months].map(([key, values]) => ({ label: key, value: mean(values) })))

  const thisWeek = (iso?: string) => !!iso && Date.now() - new Date(iso).getTime() < WEEK_MS
  const teachers = USER_ACCOUNTS.filter((u) => u.role === 'teacher')
  const parents = USER_ACCOUNTS.filter((u) => u.role === 'parent')
  USAGE_INDICATORS.activeTeachers = { value: teachers.filter((u) => thisWeek(u.lastActiveAt)).length, total: teachers.length }
  USAGE_INDICATORS.activeParents = { value: parents.filter((u) => thisWeek(u.lastActiveAt)).length, total: parents.length }
  USAGE_INDICATORS.guidanceReviewed = GUIDANCE_PLANS.filter((g) => g.status !== 'pending_review').length
  USAGE_INDICATORS.assessmentsRecorded = ASSESSMENTS.filter((a) => a.scoresEntered > 0).length
  USAGE_INDICATORS.signInsByDay = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(Date.now() - (6 - i) * 864e5)
    const value = USER_ACCOUNTS.filter((u) => u.lastActiveAt && new Date(u.lastActiveAt).toDateString() === day.toDateString()).length
    return { label: DAY[day.getDay()]!, value }
  })

  const studentsInClasses = (classId: string) => CLASSES.find((c) => c.id === classId)?.studentCount ?? 0
  const recorded = ASSESSMENTS.filter((a) => a.status !== 'draft' && a.status !== 'scheduled')
  const tone = (value: number, total: number) => (value >= total ? ('good' as const) : ('warn' as const))
  const rows = [
    { label: 'Assessments with complete scores', value: recorded.filter((a) => a.scoresEntered >= studentsInClasses(a.classId)).length, total: recorded.length },
    { label: 'Classes with a curriculum framework set', value: CLASSES.filter((c) => !!c.framework).length, total: CLASSES.length },
    { label: 'Students with a parent or guardian recorded', value: STUDENTS.filter((s) => !!s.guardianName).length, total: STUDENTS.length },
  ]
  replace(DATA_QUALITY, rows.map((r) => ({ ...r, tone: tone(r.value, r.total) })))

  // Recent activity: newest recorded assessments and guidance decisions.
  const activity: (ActivityItem & { at: string })[] = [
    ...ASSESSMENTS.filter((a) => a.scoresEntered > 0).map((a) => ({
      id: `as-${a.id}`,
      kind: 'assessment' as const,
      text: `Scores recorded for ${a.title}${CLASSES.find((c) => c.id === a.classId) ? ` (${CLASSES.find((c) => c.id === a.classId)!.name})` : ''}`,
      time: ago(a.date),
      at: a.date,
    })),
    ...GUIDANCE_PLANS.map((g) => ({
      id: `gd-${g.id}`,
      kind: 'guidance' as const,
      text: `Guidance ${g.status === 'pending_review' ? 'ready for review' : 'reviewed'} for ${STUDENTS.find((s) => s.id === g.studentId)?.name ?? 'a student'} — ${g.competencyGap}`,
      time: ago(g.decidedAt ?? g.createdOn),
      at: g.decidedAt ?? g.createdOn,
    })),
  ]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 6)
  const items = activity.map(({ at: _at, ...item }) => item)
  replace(TEACHER_ACTIVITY, items)
  replace(ADMIN_ACTIVITY, items)
}
