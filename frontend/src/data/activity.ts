/** DEMO DATA — sample recent activity feeds. */
import type { ActivityItem } from '../types'

export const TEACHER_ACTIVITY: ActivityItem[] = [
  { id: 'ac-1', kind: 'guidance', text: 'Guidance generated for Demo Student 01 — Ratio and Proportion', time: '10 min ago' },
  { id: 'ac-2', kind: 'assessment', text: 'Scores recorded for Example Quiz — Percentages (P7 A)', time: '1 hour ago' },
  { id: 'ac-3', kind: 'diagnostic', text: 'Diagnostic reports updated for P6 A after new quiz results', time: '1 hour ago' },
  { id: 'ac-4', kind: 'practice', text: '12 students completed “Understanding Ratios”', time: 'Yesterday' },
  { id: 'ac-5', kind: 'sync', text: 'Local changes synchronised', time: '2 days ago' },
]

export const ADMIN_ACTIVITY: ActivityItem[] = [
  { id: 'aa-1', kind: 'assessment', text: '4 assessments recorded across 3 classes this week', time: 'Today' },
  { id: 'aa-2', kind: 'guidance', text: 'Teachers reviewed 18 guidance plans this week', time: 'Today' },
  { id: 'aa-3', kind: 'sync', text: 'School device synchronised with central service', time: 'Today, 10:42 AM' },
  { id: 'aa-4', kind: 'diagnostic', text: 'Stage 7 (Sample Class) set to Cambridge International framework', time: '3 days ago' },
]
