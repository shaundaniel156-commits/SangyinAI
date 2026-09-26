/**
 * DEMO DATA — sample competency-level diagnostic reports.
 *
 * Reports are assembled from the generated demo student scores. No diagnostic
 * algorithm runs here; the real diagnostic engine will produce these later.
 */
import type { DiagnosticEvidence, DiagnosticReport, Student } from '../types'
import { STUDENTS } from './students'
import { getGuidanceForStudent } from './guidance'

const SHOWCASE_EVIDENCE: DiagnosticEvidence[] = [
  { assessmentTitle: 'Example Quiz — Ratio and Proportion', item: 'Q3 · Write 6 boys to 9 girls as a ratio in simplest form', outcome: 'incorrect' },
  { assessmentTitle: 'Example Quiz — Ratio and Proportion', item: 'Q7 · Share 20 sweets in the ratio 3 : 2', outcome: 'incorrect' },
  { assessmentTitle: 'Example Quiz — Ratio and Proportion', item: 'Q1 · Compare 4 red and 8 blue counters', outcome: 'correct' },
  { assessmentTitle: 'Example Assignment — Percentages in Daily Life', item: 'Task 2 · Find 25% of 80', outcome: 'partial' },
  { assessmentTitle: 'Example Test — Fractions & Decimals', item: 'Section A · Equivalent fractions', outcome: 'correct' },
  { assessmentTitle: 'Example Observation — Group Problem Solving', item: 'Explained a sharing strategy to the group', outcome: 'partial' },
]

function buildReport(student: Student, index: number): DiagnosticReport {
  const maths = student.competencies.filter((c) => c.subject === 'Mathematics')
  const byScore = [...maths].sort((a, b) => a.score - b.score)
  const needsSupport = byScore.filter((c) => c.level === 'needs_support').map((c) => c.name)
  const developing = byScore.filter((c) => c.level === 'developing').map((c) => c.name)
  const strengths = [...byScore].reverse().filter((c) => c.level === 'strength').map((c) => c.name)
  const identifiedAreas = [...needsSupport, ...developing].slice(0, 2)
  const evidence: DiagnosticEvidence[] =
    student.id === 's-001'
      ? SHOWCASE_EVIDENCE
      : byScore.slice(0, 3).map((c) => ({
          assessmentTitle: 'Example assessment item set',
          item: `Items linked to ${c.name}`,
          outcome: c.level === 'needs_support' ? 'incorrect' : c.level === 'developing' ? 'partial' : 'correct',
        }))
  return {
    id: `dg-${student.id}`,
    studentId: student.id,
    subject: 'Mathematics',
    generatedOn: `2026-09-${String(24 - (index % 5)).padStart(2, '0')}`,
    identifiedAreas,
    strengths,
    developing,
    needsSupport,
    competencies: maths,
    evidence,
    processing: index % 4 === 3 ? 'local' : 'refined',
    guidanceId: getGuidanceForStudent(student.id)?.id,
  }
}

export const DIAGNOSTIC_REPORTS: DiagnosticReport[] = STUDENTS.map(buildReport)

export function getDiagnostic(id: string): DiagnosticReport | undefined {
  return DIAGNOSTIC_REPORTS.find((d) => d.id === id)
}

export function getDiagnosticForStudent(studentId: string): DiagnosticReport | undefined {
  return DIAGNOSTIC_REPORTS.find((d) => d.studentId === studentId)
}
