/**
 * DEMO DATA — generated sample students.
 *
 * Every student is a placeholder ("Demo Student NN") created deterministically
 * so the UI can be reviewed with realistic volumes. Scores are not real and do
 * not describe any actual learner. Replace with the student API later.
 */
import { levelFromScore } from '../lib/competency'
import { createRandom } from '../lib/random'
import type { CompetencyScore, CurriculumFramework, Student, Subject } from '../types'

/** Demo competency catalogue used to generate mock mastery scores. */
export const DEMO_COMPETENCIES: { id: string; name: string; topic: string; subject: Subject }[] = [
  { id: 'm-wn', name: 'Whole Numbers', topic: 'Numbers', subject: 'Mathematics' },
  { id: 'm-fr', name: 'Fractions', topic: 'Numbers', subject: 'Mathematics' },
  { id: 'm-de', name: 'Decimals', topic: 'Numbers', subject: 'Mathematics' },
  { id: 'm-pc', name: 'Percentages', topic: 'Ratio and Proportion', subject: 'Mathematics' },
  { id: 'm-rp', name: 'Ratio and Proportion', topic: 'Ratio and Proportion', subject: 'Mathematics' },
  { id: 'm-me', name: 'Measurement', topic: 'Measures', subject: 'Mathematics' },
  { id: 'e-rc', name: 'Reading Comprehension', topic: 'Reading', subject: 'English' },
  { id: 'e-gr', name: 'Grammar', topic: 'Language Use', subject: 'English' },
  { id: 'e-wr', name: 'Composition Writing', topic: 'Writing', subject: 'English' },
]

/** Class roster sizes used by the generator (within the 30–50 pilot range where applicable). */
const ROSTERS: { classId: string; size: number; framework: CurriculumFramework; seed: number; bias: number }[] = [
  { classId: 'c-p6a', size: 38, framework: 'uganda', seed: 11, bias: 0 },
  { classId: 'c-p7a', size: 35, framework: 'uganda', seed: 23, bias: 4 },
  { classId: 'c-s1b', size: 32, framework: 'uganda', seed: 37, bias: -3 },
  { classId: 'c-st7', size: 26, framework: 'cambridge', seed: 41, bias: 6 },
]

/** Per-competency difficulty offsets so class-wide gaps look coherent in the demo. */
const DIFFICULTY: Record<string, number> = {
  'm-wn': 14,
  'm-fr': 6,
  'm-de': 0,
  'm-pc': -6,
  'm-rp': -10,
  'm-me': -2,
  'e-rc': 4,
  'e-gr': 0,
  'e-wr': -6,
}

const SUBJECTS: Subject[] = ['Mathematics', 'English', 'Science', 'Social Studies']

function clamp(n: number) {
  return Math.max(12, Math.min(98, Math.round(n)))
}

/**
 * Hand-set profile for the showcase student used in the diagnostic example:
 * strengths in Whole Numbers and Fractions; Percentages developing; Ratio and
 * Proportion requiring support.
 */
const SHOWCASE_SCORES: Record<string, number> = {
  'm-wn': 84,
  'm-fr': 76,
  'm-de': 66,
  'm-pc': 55,
  'm-rp': 38,
  'm-me': 64,
  'e-rc': 73,
  'e-gr': 68,
  'e-wr': 61,
}

function buildStudents(): Student[] {
  const students: Student[] = []
  let counter = 1
  for (const roster of ROSTERS) {
    const rand = createRandom(roster.seed)
    for (let i = 0; i < roster.size; i++) {
      const n = counter++
      const num = String(n).padStart(2, '0')
      const id = `s-${String(n).padStart(3, '0')}`
      const ability = rand.int(-16, 18) + roster.bias
      const competencies: CompetencyScore[] = DEMO_COMPETENCIES.map((c) => {
        const score =
          n === 1 ? SHOWCASE_SCORES[c.id]! : clamp(66 + ability + DIFFICULTY[c.id]! + rand.int(-8, 8))
        return { competencyId: c.id, name: c.name, topic: c.topic, subject: c.subject, score, level: levelFromScore(score) }
      })
      const average = Math.round(competencies.reduce((s, c) => s + c.score, 0) / competencies.length)
      const maths = competencies.filter((c) => c.subject === 'Mathematics')
      const weakest = [...maths].sort((a, b) => a.score - b.score)[0]!
      students.push({
        id,
        name: `Demo Student ${num}`,
        initials: num.slice(-2),
        classId: roster.classId,
        framework: roster.framework,
        subjects: SUBJECTS,
        average,
        trend: n === 1 ? 3 : rand.int(-6, 8),
        needsSupport: competencies.some((c) => c.level === 'needs_support' && c.subject === 'Mathematics'),
        currentFocus: weakest.name,
        competencies,
        guardianName: `Demo Parent ${num}`,
      })
    }
  }
  return students
}

export const STUDENTS: Student[] = buildStudents()

export function getStudent(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id)
}

export function getStudentsByClass(classId: string): Student[] {
  return STUDENTS.filter((s) => s.classId === classId)
}

/** The parent demo account is linked to these children. */
export const DEMO_PARENT_CHILD_IDS = ['s-001', 's-040']
