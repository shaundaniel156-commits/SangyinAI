/**
 * DEMO DATA — sample performance series for charts.
 * Values are illustrative only and are not measurements of real learners.
 */
import type { SeriesPoint, Subject } from '../types'
import { getClass } from './classes'

/**
 * Class average (%) across recent assessment periods. Stored as offsets from the
 * class's current demo average so the chart always ends at the figure shown
 * elsewhere in the UI.
 */
const TREND_MONTHS = ['Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep']
const TREND_OFFSETS: Record<string, number[]> = {
  'c-p6a': [-8, -6, -7, -4, -3, -2, 0],
  'c-p7a': [-4, -5, -3, -2, -3, -1, 0],
  'c-s1b': [3, 2, 1, 2, 0, 1, 0],
  'c-st7': [-7, -6, -4, -3, -3, -1, 0],
}

export function getClassTrend(classId: string): SeriesPoint[] {
  const average = getClass(classId)?.average ?? 0
  const offsets = TREND_OFFSETS[classId] ?? TREND_MONTHS.map(() => 0)
  return TREND_MONTHS.map((label, i) => ({ label, value: average + offsets[i]! }))
}

/** Subject averages (%) for the demo school, current term. */
export const SUBJECT_AVERAGES: { subject: Subject; value: number }[] = [
  { subject: 'Mathematics', value: 61 },
  { subject: 'English', value: 66 },
  { subject: 'Science', value: 63 },
  { subject: 'Social Studies', value: 68 },
]

/** Demo school-wide average across terms (admin view). */
export const SCHOOL_TREND: SeriesPoint[] = [
  { label: 'Term 1', value: 59 },
  { label: 'Term 2', value: 61 },
  { label: 'Term 3', value: 63 },
]

/** Demo individual student trend (overall %), used on profiles and portals. */
export function getStudentTrend(average: number, trend: number): SeriesPoint[] {
  const labels = ['Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep']
  const start = average - trend
  return labels.map((label, i) => ({
    label,
    value: Math.round(start + (trend * i) / (labels.length - 1) + (i % 2 === 0 ? 0 : -1)),
  }))
}

/** Demo system-usage indicators for the admin dashboard (UI placeholders). */
export const USAGE_INDICATORS = {
  weeklyActiveTeachers: { value: 4, total: 5 },
  parentViews: { value: 58, total: 131 },
  guidanceReviewed: 18,
  practiceCompleted: 214,
  weeklyActivity: [
    { label: 'Mon', value: 22 },
    { label: 'Tue', value: 31 },
    { label: 'Wed', value: 27 },
    { label: 'Thu', value: 35 },
    { label: 'Fri', value: 29 },
  ] as SeriesPoint[],
}

/**
 * Pilot-phase success criteria from the project document, with demo progress.
 * `value`/`target` are percentages; `status` replaces the bar where the measure is a field check.
 */
export const PILOT_CRITERIA: {
  metric: string
  target: string
  measurement: string
  value?: number
  goal?: number
  status?: string
}[] = [
  { metric: 'Improvement in targeted competency scores', target: '≥ 15% average uplift', measurement: 'Pre/post assessment comparison', value: 11, goal: 15 },
  { metric: 'Teacher adoption (active weekly use)', target: '≥ 70% of pilot teachers', measurement: 'System usage logs', value: 80, goal: 70 },
  { metric: 'Parent engagement with progress view', target: '≥ 50% of pilot households', measurement: 'App/SMS engagement logs', value: 44, goal: 50 },
  { metric: 'System availability offline', target: 'Core features fully functional offline', measurement: 'Field testing at low-connectivity sites', status: 'Field testing scheduled' },
  { metric: 'Curriculum alignment accuracy', target: '100% mapped to NCDC/Cambridge objectives', measurement: 'Curriculum audit review', status: 'Audit pending — demo mapping' },
]

/** Demo data-quality indicators for the admin dashboard. */
export const DATA_QUALITY = [
  { label: 'Assessments with complete scores', value: 8, total: 10, tone: 'warn' as const },
  { label: 'Students linked to a class', value: 131, total: 131, tone: 'good' as const },
  { label: 'Classes with a curriculum framework set', value: 4, total: 4, tone: 'good' as const },
  { label: 'Students with a linked parent contact', value: 112, total: 131, tone: 'warn' as const },
  { label: 'Students with parental consent recorded', value: 118, total: 131, tone: 'warn' as const },
]
