import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { GuidancePlan, GuidanceStatus } from '../types'

/**
 * FRONTEND-ONLY record of teacher decisions on guidance plans. Decisions live in
 * memory for the current session so the review workflow can be demonstrated;
 * nothing is sent anywhere. Replace with API calls later.
 */
export interface PlanEdits {
  method?: string
  rationale?: string
  pacing?: string
  practice?: string[]
}

interface Decision {
  status: GuidanceStatus
  note?: string
  edits?: PlanEdits
  decidedAt: string
}

interface GuidanceReviewValue {
  decisions: Record<string, Decision>
  decide: (planId: string, status: GuidanceStatus, note?: string) => void
  saveEdits: (planId: string, edits: PlanEdits) => void
  reset: (planId: string) => void
  /** The plan with any local decision/edits applied. */
  resolve: (plan: GuidancePlan) => GuidancePlan & { edited: boolean; decidedAt?: string }
}

const GuidanceReviewContext = createContext<GuidanceReviewValue | null>(null)

function now() {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

export function GuidanceReviewProvider({ children }: { children: ReactNode }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})

  const decide = useCallback<GuidanceReviewValue['decide']>((planId, status, note) => {
    setDecisions((d) => ({ ...d, [planId]: { ...d[planId], status, note, decidedAt: now() } }))
  }, [])

  const saveEdits = useCallback<GuidanceReviewValue['saveEdits']>((planId, edits) => {
    setDecisions((d) => ({
      ...d,
      [planId]: { status: d[planId]?.status ?? 'pending_review', note: d[planId]?.note, edits: { ...d[planId]?.edits, ...edits }, decidedAt: now() },
    }))
  }, [])

  const reset = useCallback((planId: string) => {
    setDecisions((d) => {
      const next = { ...d }
      delete next[planId]
      return next
    })
  }, [])

  const resolve = useCallback<GuidanceReviewValue['resolve']>(
    (plan) => {
      const d = decisions[plan.id]
      if (!d) return { ...plan, edited: false }
      return {
        ...plan,
        status: d.status,
        teacherNote: d.note ?? plan.teacherNote,
        teachingApproach: {
          method: d.edits?.method ?? plan.teachingApproach.method,
          rationale: d.edits?.rationale ?? plan.teachingApproach.rationale,
        },
        pacing: d.edits?.pacing ?? plan.pacing,
        practice: d.edits?.practice ?? plan.practice,
        edited: Boolean(d.edits),
        decidedAt: d.decidedAt,
      }
    },
    [decisions],
  )

  const value = useMemo(() => ({ decisions, decide, saveEdits, reset, resolve }), [decisions, decide, saveEdits, reset, resolve])
  return <GuidanceReviewContext.Provider value={value}>{children}</GuidanceReviewContext.Provider>
}

export function useGuidanceReview(): GuidanceReviewValue {
  const ctx = useContext(GuidanceReviewContext)
  if (!ctx) throw new Error('useGuidanceReview must be used within GuidanceReviewProvider')
  return ctx
}
