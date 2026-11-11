import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AiDraft } from '../lib/aiAssessment'
import { api } from '../lib/api'
import { LIVE_AI_ASSESSMENTS } from '../lib/liveData'
import { readStorage, writeStorage } from '../lib/storage'
import type { AiAssessment, PracticeConfidence, PracticeFeedback } from '../types'
import { useLiveData } from './LiveDataContext'
import { useToast } from './ToastContext'

/**
 * AI-drafted assessments and student attempts.
 * - Signed in through the backend: drafts, edits, sending and students' answers are saved there, so other
 *   teachers and the student's own device see them.
 * - If the server can't be reached: kept in this browser's localStorage until it can.
 */
export interface AttemptResult {
  score: number
  total: number
  completedOn: string
  /** What the student told their teacher on their Feedback page, when they have. */
  feedback?: PracticeFeedback
  confidence?: PracticeConfidence
}

/** A photo of written work, as sent to the server (base64). */
export interface WorkUpload {
  mimeType: string
  data: string
}

/** The server's marking of a student's answers. Written work carries the AI's feedback, or is pending the teacher. */
export interface MarkedAttempt extends AttemptResult {
  questions: { id: string; given: string; correct: boolean; answer: string; explanation: string; feedback?: string; pending?: boolean }[]
}

interface AiAssessmentsValue {
  items: AiAssessment[]
  attempts: Record<string, AttemptResult>
  create: (draft: AiDraft) => Promise<AiAssessment>
  update: (id: string, patch: Partial<AiAssessment>) => void
  remove: (id: string) => void
  send: (id: string) => Promise<void>
  recordAttempt: (id: string, result: Omit<AttemptResult, 'completedOn'>) => void
  /** Signed in: sends the student's answers to be marked and saved; returns the marking. Offline: null (mark locally). */
  submitAnswers: (id: string, answers: Record<string, string>, work?: Record<string, WorkUpload>) => Promise<MarkedAttempt | null>
}

const AiAssessmentsContext = createContext<AiAssessmentsValue | null>(null)
const ITEMS_KEY = 'sangyin.aiAssessments'
const ATTEMPTS_KEY = 'sangyin.aiAssessmentAttempts'
const SAVE_DELAY_MS = 600

// Fields a teacher can change on a draft (the backend accepts these in PATCH).
const EDITABLE = ['title', 'subject', 'competencies', 'studentIds', 'questions', 'difficulty', 'dueDate', 'messageToStudents', 'reportNotes', 'rationale', 'curriculumRefs', 'parentNote', 'shareWithParents'] as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = readStorage(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function AiAssessmentsProvider({ children }: { children: ReactNode }) {
  const { live, version } = useLiveData()
  const { notify } = useToast()
  const [items, setItems] = useState<AiAssessment[]>(() => (live ? [...LIVE_AI_ASSESSMENTS] : load(ITEMS_KEY, [])))
  const [attempts, setAttempts] = useState<Record<string, AttemptResult>>(() =>
    live ? Object.fromEntries(LIVE_AI_ASSESSMENTS.filter((a) => a.attempt).map((a) => [a.id, a.attempt!])) : load(ATTEMPTS_KEY, {}),
  )
  const pending = useRef(new Map<string, { patch: Partial<AiAssessment>; timer: ReturnType<typeof setTimeout> }>())
  // Drafts edited here since the data was last reloaded.
  const edited = useRef(new Set<string>())

  // The data was reloaded (LiveDataContext): take the server's list. A draft edited here meanwhile keeps this
  // page's copy, which may be newer than the one the reload read; a result just handed in is kept too.
  const loaded = useRef(version)
  useEffect(() => {
    if (!live || loaded.current === version) return
    loaded.current = version
    const mine = edited.current
    edited.current = new Set()
    setItems((list) => LIVE_AI_ASSESSMENTS.map((a) => (mine.has(a.id) ? (list.find((x) => x.id === a.id) ?? a) : a)))
    setAttempts((a) => ({ ...a, ...Object.fromEntries(LIVE_AI_ASSESSMENTS.filter((x) => x.attempt).map((x) => [x.id, x.attempt!])) }))
  }, [live, version])

  useEffect(() => { if (!live) writeStorage(ITEMS_KEY, JSON.stringify(items)) }, [items, live])
  useEffect(() => { if (!live) writeStorage(ATTEMPTS_KEY, JSON.stringify(attempts)) }, [attempts, live])

  const failed = useCallback((title: string) => (error: Error) => notify(title, { tone: 'info', description: error.message }), [notify])

  // Sends a draft's waiting edits now (used before sending, and by the timer).
  const flush = useCallback(async (id: string) => {
    const entry = pending.current.get(id)
    if (!entry) return
    clearTimeout(entry.timer)
    pending.current.delete(id)
    const body = Object.fromEntries(EDITABLE.filter((k) => entry.patch[k] !== undefined).map((k) => [k, entry.patch[k]]))
    if (Object.keys(body).length) await api(`/ai/assessments/${id}`, { method: 'PATCH', body })
  }, [])

  const create = useCallback(async (draft: AiDraft) => {
    if (live) {
      const saved = await api<AiAssessment>('/ai/assessments', { body: draft })
      setItems((list) => [saved, ...list])
      return saved
    }
    const item: AiAssessment = { ...draft, id: `ai-${Date.now().toString(36)}`, createdOn: new Date().toISOString(), status: 'draft' }
    setItems((list) => [item, ...list])
    return item
  }, [live])

  const update = useCallback((id: string, patch: Partial<AiAssessment>) => {
    setItems((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    if (!live) return
    edited.current.add(id)
    // Typing calls this on every key; save once the teacher pauses.
    const prev = pending.current.get(id)
    if (prev) clearTimeout(prev.timer)
    const timer = setTimeout(() => { flush(id).catch(failed('Changes not saved')) }, SAVE_DELAY_MS)
    pending.current.set(id, { patch: { ...prev?.patch, ...patch }, timer })
  }, [live, flush, failed])

  const remove = useCallback((id: string) => {
    const entry = pending.current.get(id)
    if (entry) { clearTimeout(entry.timer); pending.current.delete(id) }
    setItems((list) => list.filter((a) => a.id !== id))
    if (live) api(`/ai/assessments/${id}`, { method: 'DELETE' }).catch(failed('Draft not discarded'))
  }, [live, failed])

  const send = useCallback(async (id: string) => {
    if (live) {
      try {
        await flush(id)
        const sent = await api<AiAssessment>(`/ai/assessments/${id}/send`, { method: 'POST' })
        setItems((list) => list.map((a) => (a.id === id ? { ...a, ...sent } : a)))
      } catch (error) {
        failed('Not sent')(error as Error)
        throw error
      }
      return
    }
    setItems((list) => list.map((a) => (a.id === id ? { ...a, status: 'sent', sentOn: new Date().toISOString() } : a)))
  }, [live, flush, failed])

  const recordAttempt = useCallback((id: string, result: Omit<AttemptResult, 'completedOn'>) => {
    setAttempts((a) => ({ ...a, [id]: { ...result, completedOn: new Date().toISOString() } }))
  }, [])

  const submitAnswers = useCallback(async (id: string, answers: Record<string, string>, work: Record<string, WorkUpload> = {}) => {
    const item = items.find((a) => a.id === id)
    if (!live) return null
    // Signed in, the result must reach the server, or it would be lost on the next visit and never reach the teacher.
    if (!item?.practiceId) throw new Error('This practice is not linked to your account yet. Refresh the page and try again.')
    const marked = await api<MarkedAttempt>(`/practice/${item.practiceId}/answers`, { body: { answers, ...(Object.keys(work).length ? { work } : {}) } })
    setAttempts((a) => ({ ...a, [id]: { score: marked.score, total: marked.total, completedOn: marked.completedOn } }))
    return marked
  }, [items, live])

  const value = useMemo(
    () => ({ items, attempts, create, update, remove, send, recordAttempt, submitAnswers }),
    [items, attempts, create, update, remove, send, recordAttempt, submitAnswers],
  )
  return <AiAssessmentsContext.Provider value={value}>{children}</AiAssessmentsContext.Provider>
}

export function useAiAssessments(): AiAssessmentsValue {
  const ctx = useContext(AiAssessmentsContext)
  if (!ctx) throw new Error('useAiAssessments must be used within AiAssessmentsProvider')
  return ctx
}
