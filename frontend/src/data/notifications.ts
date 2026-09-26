/** DEMO DATA — sample notifications for each role. */
import type { AppNotification } from '../types'

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n-01', kind: 'guidance_review', title: 'AI guidance ready for review', body: 'A new teaching plan for Demo Student 01 (Ratio and Proportion) is waiting for your review.', time: '10 min ago', read: false, roles: ['teacher'], link: '/guidance/gd-s-001' },
  { id: 'n-02', kind: 'assessment_results', title: 'New assessment results', body: 'Scores for “Example Quiz — Percentages” (P7 A) have been recorded.', time: '1 hour ago', read: false, roles: ['teacher', 'admin'], link: '/assessments/as-06' },
  { id: 'n-03', kind: 'student_attention', title: 'Student requires attention', body: 'Demo Student 07 has areas requiring support in two consecutive assessments.', time: '3 hours ago', read: false, roles: ['teacher'], link: '/students/s-007' },
  { id: 'n-04', kind: 'parent_communication', title: 'Parent note sent', body: 'Home-support notes for 6 approved plans were queued for parents in P6 A.', time: 'Yesterday', read: true, roles: ['teacher'] },
  { id: 'n-05', kind: 'practice_update', title: 'Practice activity update', body: '12 students in P6 A completed “Understanding Ratios”.', time: 'Yesterday', read: true, roles: ['teacher'] },
  { id: 'n-06', kind: 'system', title: 'Sync completed', body: 'Local changes were synchronised successfully.', time: '2 days ago', read: true, roles: ['teacher', 'admin'] },
  { id: 'n-07', kind: 'system', title: 'Data quality check', body: '3 assessments are missing scores for some students.', time: '1 hour ago', read: false, roles: ['admin'], link: '/assessments' },
  { id: 'n-08', kind: 'system', title: 'Teacher invitation pending', body: 'Demo Teacher 4 has not yet accepted their invitation.', time: 'Yesterday', read: true, roles: ['admin'], link: '/admin/teachers' },
  { id: 'n-09', kind: 'parent_communication', title: 'New learning focus', body: 'Demo Student 01 is now working on Ratio and Proportion. See how you can help at home.', time: '2 hours ago', read: false, roles: ['parent'], link: '/parent/focus' },
  { id: 'n-10', kind: 'assessment_results', title: 'New results available', body: 'Results from the recent Mathematics quiz are ready to view.', time: 'Yesterday', read: false, roles: ['parent'], link: '/parent/progress' },
  { id: 'n-11', kind: 'practice_update', title: 'Practice completed', body: 'Demo Student 01 completed “Equivalent Fractions”. Well done!', time: '3 days ago', read: true, roles: ['parent'] },
  { id: 'n-12', kind: 'practice_update', title: 'New practice ready', body: '“Equivalent Ratios” has been added to your practice list.', time: '30 min ago', read: false, roles: ['student'], link: '/student/practice' },
  { id: 'n-13', kind: 'assessment_results', title: 'Your quiz feedback is ready', body: 'See how you did in the Ratio and Proportion quiz.', time: 'Yesterday', read: false, roles: ['student'], link: '/student/feedback' },
  { id: 'n-14', kind: 'practice_update', title: 'Great work!', body: 'You finished “Equivalent Fractions”.', time: '3 days ago', read: true, roles: ['student'] },
]
