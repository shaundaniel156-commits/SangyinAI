import type { Subject } from '../../../types'

export type ReportType = 'student' | 'class' | 'subject' | 'competency'

export interface ReportFilters {
  term: string
  /** Optional ISO dates (yyyy-mm-dd) limiting which assessments are listed. */
  from: string
  to: string
  classId: string
  studentId: string
  subject: Subject | 'all'
}

export const REPORT_TITLES: Record<ReportType, string> = {
  student: 'Student report',
  class: 'Class report',
  subject: 'Subject performance report',
  competency: 'Competency report',
}

/** True when an ISO date falls within the optional from/to range (inclusive). */
export function inDateRange(date: string, from: string, to: string): boolean {
  return (!from || date >= from) && (!to || date <= to)
}
