import { getClass } from '../../../data/classes'
import { getGuidanceForStudent } from '../../../data/guidance'
import { levelFromScore } from '../../../lib/competency'
import type { CompetencyScore, Student } from '../../../types'

export interface HomeTip {
  id: string
  title: string
  tip: string
  minutes: number
}

/**
 * Plain-language summary of a child for the parent portal. Home-support tips come only from
 * guidance plans a teacher has approved.
 */
export function getChildSummary(child: Student) {
  const sorted = [...child.competencies].sort((a, b) => b.score - a.score)
  const strengths = sorted.filter((c) => c.level === 'strength').slice(0, 3)
  const needsPractice: CompetencyScore[] = [...sorted].reverse().filter((c) => c.level !== 'strength').slice(0, 3)
  const guidance = getGuidanceForStudent(child.id)
  const approvedNote = guidance?.status === 'approved' ? guidance.outputs.parentNote : null

  const tips: HomeTip[] = []
  if (approvedNote) tips.push({ id: `gd-${child.id}`, title: `Practise ${child.currentFocus.toLowerCase()} together`, tip: approvedNote, minutes: 10 })

  return {
    className: getClass(child.classId)?.name ?? 'Class not set',
    overallLevel: levelFromScore(child.average),
    progressWords: trendWords(child.trend),
    focus: child.currentFocus,
    strengths,
    needsPractice,
    tips,
  }
}

function trendWords(trend: number): string {
  if (trend > 0) return 'Improving since last term'
  if (trend < 0) return 'A little lower than last term'
  return 'Steady since last term'
}
