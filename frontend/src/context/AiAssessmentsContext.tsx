import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AiDraft } from '../lib/aiAssessment'
import { api } from '../lib/api'
import { LIVE_AI_ASSESSMENTS } from '../lib/liveData'
import { readStorage, writeStorage } from '../lib/storage'
import type { AiAssessment } from '../types'
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
}

/** The server's marking of a student's answers. */
export interface MarkedAttempt extends AttemptResult {
  questions: { id: string; given: string; correct: boolean; answer: string; explanation: string }[]
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
  submitAnswers: (id: string, answers: Record<string, string>) => Promise<MarkedAttempt | null>
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
  const { live } = useLiveData()
  const { notify } = useToast()
  const [items, setItems] = useState<AiAssessment[]>(() => (live ? [...LIVE_AI_ASSESSMENTS] : load(ITEMS_KEY, [])))
  const [attempts, setAttempts] = useState<Record<string, AttemptResult>>(() =>
    live ? Object.fromEntries(LIVE_AI_ASSESSMENTS.filter((a) => a.attempt).map((a) => [a.id, a.attempt!])) : load(ATTEMPTS_KEY, {}),
  )
  const pending = useRef(new Map<string, { patch: Partial<AiAssessment>; timer: ReturnType<typeof setTimeout> }>())

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

  const submitAnswers = useCallback(async (id: string, answers: Record<string, string>) => {
    const item = items.find((a) => a.id === id)
    if (!live || !item?.practiceId) return null
    const marked = await api<MarkedAttempt>(`/practice/${item.practiceId}/answers`, { body: { answers } })
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
