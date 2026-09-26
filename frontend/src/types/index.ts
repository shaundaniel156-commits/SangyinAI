/**
 * Shared frontend types.
 *
 * These describe the shape of data the UI renders. At this prototype stage they
 * are populated from mock data in `src/data/*`; later they will map onto API
 * responses.
 */

export type Role = 'teacher' | 'admin' | 'parent' | 'student'

export type CurriculumFramework = 'uganda' | 'cambridge'

/** Competency level as displayed in the UI. */
export type CompetencyLevel = 'strength' | 'developing' | 'needs_support'

export type ConnectivityStatus = 'online' | 'offline' | 'syncing'

export type Subject = 'Mathematics' | 'English' | 'Science' | 'Social Studies'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: Role
  title: string
  initials: string
}

// ---------------------------------------------------------------------------
// Students & classes
// ---------------------------------------------------------------------------

export interface CompetencyScore {
  competencyId: string
  name: string
  topic: string
  subject: Subject
  /** Mastery estimate 0–100 (demo value). */
  score: number
  level: CompetencyLevel
}

export interface Student {
  id: string
  name: string
  initials: string
  classId: string
  framework: CurriculumFramework
  subjects: Subject[]
  /** Overall average across recent assessments, 0–100 (demo value). */
  average: number
  /** Change vs. previous term in percentage points (demo value). */
  trend: number
  needsSupport: boolean
  currentFocus: string
  competencies: CompetencyScore[]
  guardianName: string
}

export interface SchoolClass {
  id: string
  name: string
  level: string
  framework: CurriculumFramework
  teacherId: string
  subjects: Subject[]
  studentCount: number
  average: number
  trend: number
  commonGaps: { competency: string; subject: Subject; studentsAffected: number }[]
}

export interface Teacher {
  id: string
  name: string
  initials: string
  email: string
  subjects: Subject[]
  classIds: string[]
  status: 'active' | 'invited' | 'inactive'
  lastActive: string
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

/** Sources of performance data named in the project document. */
export type AssessmentType = 'Test' | 'Quiz' | 'Assignment' | 'Teacher Observation'

export type AssessmentStatus = 'draft' | 'scheduled' | 'awaiting_scores' | 'completed'

export interface Assessment {
  id: string
  title: string
  type: AssessmentType
  subject: Subject
  classId: string
  date: string
  maxScore: number
  status: AssessmentStatus
  topics: string[]
  /** Class average as a percentage, when scores exist. */
  average?: number
  scoresEntered: number
}

export interface AssessmentResult {
  studentId: string
  score: number | null
  remark?: string
}

// ---------------------------------------------------------------------------
// Diagnostics & guidance
// ---------------------------------------------------------------------------

export interface DiagnosticEvidence {
  assessmentTitle: string
  item: string
  outcome: 'correct' | 'partial' | 'incorrect'
}

export interface DiagnosticReport {
  id: string
  studentId: string
  subject: Subject
  generatedOn: string
  identifiedAreas: string[]
  strengths: string[]
  developing: string[]
  needsSupport: string[]
  competencies: CompetencyScore[]
  evidence: DiagnosticEvidence[]
  /** Local vs. refined processing — displayed as a UI state only. */
  processing: 'local' | 'refined'
  guidanceId?: string
}

export type GuidanceStatus = 'pending_review' | 'approved' | 'revision_requested' | 'overridden'

export interface GuidanceStep {
  title: string
  detail: string
}

export interface GuidancePlan {
  id: string
  studentId: string
  subject: Subject
  competencyGap: string
  curriculumReference: string
  createdOn: string
  status: GuidanceStatus
  teachingApproach: { method: string; rationale: string }
  sequence: GuidanceStep[]
  pacing: string
  practice: string[]
  /** The three role-specific outputs produced from one plan. */
  outputs: {
    teacherSheet: string
    parentNote: string
    studentSequence: string[]
  }
  teacherNote?: string
}

// ---------------------------------------------------------------------------
// AI-generated remedial assessments (teacher drafts → review → sent to students)
// ---------------------------------------------------------------------------

export type AiQuestionType = 'multiple_choice' | 'short_answer'

export type AiDifficulty = 'foundation' | 'core' | 'stretch'

export interface AiQuestion {
  id: string
  /** Question-bank entry this came from, so "regenerate" can pick a different one. */
  sourceId: string
  competency: string
  type: AiQuestionType
  difficulty: AiDifficulty
  prompt: string
  /** Multiple choice only. */
  options?: string[]
  answer: string
  explanation: string
}

export type AiAssessmentStatus = 'draft' | 'sent'

export interface AiAssessment {
  id: string
  title: string
  classId: string
  subject: Subject
  /** Competency gaps the assessment targets. */
  competencies: string[]
  studentIds: string[]
  questions: AiQuestion[]
  difficulty: AiDifficulty | 'mixed'
  dueDate: string
  messageToStudents: string
  /** What the teacher submitted alongside the recorded results. */
  reportNotes: string
  /** Why the draft looks the way it does, shown to the teacher during review. */
  rationale: string[]
  /** Curriculum learning outcomes (NCDC) or objectives (Cambridge) the targeted gaps map to. */
  curriculumRefs?: string[]
  /** Plain-language home-support note shared with parents once the teacher approves. */
  parentNote?: string
  shareWithParents?: boolean
  createdOn: string
  status: AiAssessmentStatus
  sentOn?: string
}

// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

export interface LearningObjective {
  id: string
  code: string
  text: string
}

export interface CurriculumCompetency {
  id: string
  name: string
  objectives: LearningObjective[]
}

export interface CurriculumTopic {
  id: string
  name: string
  competencies: CurriculumCompetency[]
}

export interface CurriculumSubject {
  id: string
  name: Subject
  topics: CurriculumTopic[]
}

export interface CurriculumLevel {
  id: string
  name: string
  stage: string
  subjects: CurriculumSubject[]
}

export interface CurriculumFrameworkData {
  id: CurriculumFramework
  name: string
  shortName: string
  description: string
  levels: CurriculumLevel[]
}

// ---------------------------------------------------------------------------
// Notifications & activity
// ---------------------------------------------------------------------------

export type NotificationKind =
  | 'assessment_results'
  | 'guidance_review'
  | 'student_attention'
  | 'parent_communication'
  | 'practice_update'
  | 'system'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  time: string
  read: boolean
  roles: Role[]
  link?: string
}

export interface ActivityItem {
  id: string
  text: string
  time: string
  kind: 'assessment' | 'guidance' | 'diagnostic' | 'sync' | 'practice'
}

// ---------------------------------------------------------------------------
// Performance series
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  label: string
  value: number
}

// ---------------------------------------------------------------------------
// Student & parent portals
// ---------------------------------------------------------------------------

export type PracticeStatus = 'not_started' | 'in_progress' | 'completed'

export interface PracticeActivity {
  id: string
  title: string
  focus: string
  subject: Subject
  status: PracticeStatus
  questions: number
  estimatedMinutes: number
  dueLabel?: string
  completedOn?: string
  feedback?: 'easy' | 'okay' | 'difficult'
}
