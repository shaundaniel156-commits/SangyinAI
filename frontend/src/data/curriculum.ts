/**
 * Curriculum frameworks. The levels, subjects, topics and competencies are loaded from the backend after sign-in
 * (lib/liveData.ts replaces this list): Sangyin's own-words outline and whatever the school adds in the Manual feed.
 */
import type { CurriculumFramework, CurriculumFrameworkData } from '../types'

export const CURRICULUM_DISCLAIMER =
  'Curriculum entries are Sangyin’s own-words outline plus what your school has added — check them against the official NCDC or Cambridge documents.'

export const CURRICULUM_FRAMEWORKS: CurriculumFrameworkData[] = [
  {
    id: 'uganda',
    name: 'Uganda National Curriculum',
    shortName: 'NCDC',
    description: 'Competency-based framework used in government-aided and many private schools in Uganda. Guidance maps to NCDC learning outcomes and supports UNEB assessment objectives for exam preparation.',
    levels: [],
  },
  {
    id: 'cambridge',
    name: 'Cambridge International Curriculum',
    shortName: 'Cambridge',
    description: 'International framework used by schools running Cambridge programmes and examinations (Primary, Lower Secondary and IGCSE). Guidance maps to Cambridge learning and assessment objectives.',
    levels: [],
  },
]

export function getFramework(id: CurriculumFramework): CurriculumFrameworkData {
  // The institution's own curriculum only exists once it has been added (Manual feed); offline it is empty.
  return CURRICULUM_FRAMEWORKS.find((f) => f.id === id) ?? { id, name: FRAMEWORK_LABEL[id], shortName: 'Own', description: 'Add your own programmes, courses and topics in the Manual feed.', levels: [] }
}

export const FRAMEWORK_LABEL: Record<CurriculumFramework, string> = {
  uganda: 'Uganda National Curriculum',
  cambridge: 'Cambridge International',
  institution: 'Own curriculum',
}
