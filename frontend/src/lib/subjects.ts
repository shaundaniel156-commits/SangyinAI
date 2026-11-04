import { SCHOOL } from '../data/school'

// The subjects a school offers, by its level and curriculum (chosen on the "Your school" step before signing in).
// These are the standard choices; a class, teacher or exam can still use any other subject or course unit.

const UGANDA_PRIMARY = ['English', 'Mathematics', 'Science', 'Social Studies', 'Religious Education', 'Kiswahili', 'Physical Education', 'Creative Arts']

/** Lower secondary (competency-based curriculum): the compulsory subjects, then the electives. */
const UGANDA_SECONDARY = [
  'English',
  'Mathematics',
  'History',
  'Geography',
  'Physics',
  'Biology',
  'Chemistry',
  'Physical Education',
  'Religious Education (CRE)',
  'Religious Education (IRE)',
  'Entrepreneurship',
  'Kiswahili',
  // Electives: one chosen by interest or career goal.
  'Agriculture',
  'Computer Studies',
  'Art and Design',
  'Performing Arts',
  'Literature in English',
  'French',
  'German',
  'Arabic',
]

const CAMBRIDGE_PRIMARY = ['English', 'Mathematics', 'Science', 'Global Perspectives', 'Computing', 'Art and Design', 'Music', 'Physical Education']

const CAMBRIDGE_SECONDARY = [
  'English',
  'Mathematics',
  'Physics',
  'Biology',
  'Chemistry',
  'History',
  'Geography',
  'Global Perspectives',
  'Computer Science',
  'Business Studies',
  'Economics',
  'Art and Design',
  'Music',
  'Physical Education',
  'Literature in English',
  'French',
  'Kiswahili',
]

const unique = (names: string[]) => [...new Set(names)]

/** The standard subjects for a school level (primary, secondary or mixed) and curriculum. Universities have none: they use course units. */
export function subjectsFor(type: string, framework: string): string[] {
  const primary = framework === 'cambridge' ? CAMBRIDGE_PRIMARY : UGANDA_PRIMARY
  const secondary = framework === 'cambridge' ? CAMBRIDGE_SECONDARY : UGANDA_SECONDARY
  if (type === 'primary') return primary
  if (type === 'secondary') return secondary
  if (type === 'mixed') return unique([...primary, ...secondary])
  return []
}

/** The signed-in school's standard subjects. */
export function schoolSubjects(): string[] {
  return subjectsFor(SCHOOL.level, SCHOOL.primaryFramework)
}

/** Subjects to choose from: the ones already in use (a class's own list, teachers' subjects…) first, then the school's standard ones. */
export function subjectChoices(...inUse: string[][]): string[] {
  return unique([...inUse.flat().filter(Boolean), ...schoolSubjects()])
}
