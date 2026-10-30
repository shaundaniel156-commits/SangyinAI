import type { CurriculumFramework } from '../types'

/** The signed-in person's school, loaded from the backend after sign-in (lib/liveData.ts fills it in place). */
export const SCHOOL = {
  name: '',
  type: '',
  /** primary, secondary, university or mixed: with primaryFramework, decides the class names offered (lib/classLevels.ts). */
  level: '',
  location: '',
  primaryFramework: 'uganda' as CurriculumFramework,
  academicYear: String(new Date().getFullYear()),
  currentTerm: '',
  termOptions: [] as string[],
  contactEmail: '',
}

/** The school's name, or a neutral label before it has loaded. */
export function schoolName(): string {
  return SCHOOL.name || 'Your school'
}
