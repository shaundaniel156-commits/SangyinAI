/** AI guidance plans, loaded from the backend after sign-in (lib/liveData.ts fills the list in place). */
import type { GuidancePlan, GuidanceStatus } from '../types'

export const GUIDANCE_PLANS: GuidancePlan[] = []

export function getGuidance(id: string): GuidancePlan | undefined {
  return GUIDANCE_PLANS.find((g) => g.id === id)
}

export function getGuidanceForStudent(studentId: string): GuidancePlan | undefined {
  return GUIDANCE_PLANS.find((g) => g.studentId === studentId)
}

export const GUIDANCE_STATUS_LABEL: Record<GuidanceStatus, string> = {
  pending_review: 'Awaiting review',
  approved: 'Approved',
  revision_requested: 'Revision requested',
  overridden: 'Overridden',
}
