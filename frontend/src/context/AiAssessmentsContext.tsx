import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AiDraft } from '../lib/aiAssessment'
import { readStorage, writeStorage } from '../lib/storage'
import type { AiAssessment } from '../types'

/**
 * FRONTEND-ONLY store for AI-drafted assessments and student attempts. Kept in
 * localStorage so the teacher → student hand-off survives a refresh in the demo;
 * nothing leaves the browser. Replace with API calls later.
 */
export interface AttemptResult {
  score: number
  total: number
  completedOn: string
}

interface AiAssessmentsValue {
  items: AiAssessment[]
  attempts: Record<string, AttemptResult>
  create: (draft: AiDraft) => AiAssessment
  update: (id: string, patch: Partial<AiAssessment>) => void
  remove: (id: string) => void
  send: (id: string) => void
  recordAttempt: (id: string, result: Omit<AttemptResult, 'completedOn'>) => void
}

const AiAssessmentsContext = createContext<AiAssessmentsValue | null>(null)
const ITEMS_KEY = 'sangyin.aiAssessments'
const ATTEMPTS_KEY = 'sangyin.aiAssessmentAttempts'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = readStorage(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function AiAssessmentsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AiAssessment[]>(() => load(ITEMS_KEY, []))
  const [attempts, setAttempts] = useState<Record<string, AttemptResult>>(() => load(ATTEMPTS_KEY, {}))

  useEffect(() => writeStorage(ITEMS_KEY, JSON.stringify(items)), [items])
  useEffect(() => writeStorage(ATTEMPTS_KEY, JSON.stringify(attempts)), [attempts])

  const create = useCallback((draft: AiDraft) => {
    const item: AiAssessment = { ...draft, id: `ai-${Date.now().toString(36)}`, createdOn: new Date().toISOString(), status: 'draft' }
    setItems((list) => [item, ...list])
    return item
  }, [])

  const update = useCallback((id: string, patch: Partial<AiAssessment>) => {
    setItems((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [])

  const remove = useCallback((id: string) => setItems((list) => list.filter((a) => a.id !== id)), [])

  const send = useCallback((id: string) => {
    setItems((list) => list.map((a) => (a.id === id ? { ...a, status: 'sent', sentOn: new Date().toISOString() } : a)))
  }, [])

  const recordAttempt = useCallback((id: string, result: Omit<AttemptResult, 'completedOn'>) => {
    setAttempts((a) => ({ ...a, [id]: { ...result, completedOn: new Date().toISOString() } }))
  }, [])

  const value = useMemo(() => ({ items, attempts, create, update, remove, send, recordAttempt }), [items, attempts, create, update, remove, send, recordAttempt])
  return <AiAssessmentsContext.Provider value={value}>{children}</AiAssessmentsContext.Provider>
}

export function useAiAssessments(): AiAssessmentsValue {
  const ctx = useContext(AiAssessmentsContext)
  if (!ctx) throw new Error('useAiAssessments must be used within AiAssessmentsProvider')
  return ctx
}
