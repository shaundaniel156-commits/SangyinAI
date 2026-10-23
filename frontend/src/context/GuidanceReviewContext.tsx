import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { GUIDANCE_PLANS } from '../data/guidance'
import { api } from '../lib/api'
import type { GuidancePlan, GuidanceStatus } from '../types'
import { useLiveData } from './LiveDataContext'
import { useToast } from './ToastContext'

/**
 * Teacher decisions on guidance plans. Decisions are saved to the server (PATCH /guidance/:id) and kept in
 * memory meanwhile, so the page updates straight away.
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

/** A decision time from the backend, e.g. "22 Oct, 14:05". */
function formatDecidedAt(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function GuidanceReviewProvider({ children }: { children: ReactNode }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const { live } = useLiveData()
  const { notify } = useToast()

  const forget = useCallback((planId: string) => {
    setDecisions((d) => {
      const next = { ...d }
      delete next[planId]
      return next
    })
  }, [])

  // Signed in through the backend: save the change there. The local decision shows at once; when the server
  // confirms, its copy of the plan replaces the one loaded and the local decision is no longer needed.
  const save = useCallback(
    (planId: string, body: Record<string, unknown>) => {
      if (!live) return
      api<GuidancePlan>(`/guidance/${planId}`, { method: 'PATCH', body })
        .then((saved) => {
          const plan = GUIDANCE_PLANS.find((p) => p.id === planId)
          if (plan) Object.assign(plan, saved)
          forget(planId)
        })
        .catch((error: Error) => {
          forget(planId)
          notify('Decision not saved', { tone: 'info', description: error.message })
        })
    },
    [live, forget, notify],
  )

  const decide = useCallback<GuidanceReviewValue['decide']>((planId, status, note) => {
    setDecisions((d) => ({ ...d, [planId]: { ...d[planId], status, note, decidedAt: now() } }))
    save(planId, { status, ...(note !== undefined ? { note } : {}) })
  }, [save])

  const saveEdits = useCallback<GuidanceReviewValue['saveEdits']>((planId, edits) => {
    setDecisions((d) => ({
      ...d,
      [planId]: { status: d[planId]?.status ?? 'pending_review', note: d[planId]?.note, edits: { ...d[planId]?.edits, ...edits }, decidedAt: now() },
    }))
    save(planId, { edits })
  }, [save])

  const reset = useCallback((planId: string) => {
    forget(planId)
    save(planId, { status: 'pending_review', note: null, edits: null })
  }, [forget, save])

  const resolve = useCallback<GuidanceReviewValue['resolve']>(
    (plan) => {
      const d = decisions[plan.id]
      if (!d) return { ...plan, edited: plan.edited ?? false, decidedAt: plan.decidedAt ? formatDecidedAt(plan.decidedAt) : undefined }
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
