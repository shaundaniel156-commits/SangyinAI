import { useAiAssessments } from '../../../context/AiAssessmentsContext'
import type { PracticeActivity } from '../../../types'
import { TakeAssessmentModal } from './TakeAssessmentModal'

/** Opens a practice activity: the teacher-approved assessment it comes from, ready to answer. */
export function PracticeModal({ activity, onClose }: { activity: PracticeActivity | null; onClose: () => void }) {
  const { items } = useAiAssessments()
  const assessment = activity?.aiAssessmentId ? (items.find((a) => a.id === activity.aiAssessmentId) ?? null) : null
  return <TakeAssessmentModal key={assessment?.id} assessment={assessment} onClose={onClose} />
}
