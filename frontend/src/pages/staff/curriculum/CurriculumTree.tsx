import { ChevronDown, ChevronRight, Plus, Target, Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { cn } from '../../../lib/cn'
import type { CurriculumCompetency, CurriculumTopic } from '../../../types'

/** Adding and removing a school's own objectives. Absent when the user can't edit (or is offline). */
export interface ObjectiveEditing {
  onAdd: (competency: CurriculumCompetency, code: string, text: string) => Promise<void>
  onRemove: (competency: CurriculumCompetency, objectiveId: string) => Promise<void>
}

interface CurriculumTreeProps {
  topics: CurriculumTopic[]
  expanded: Set<string>
  onToggle: (topicId: string) => void
  editing?: ObjectiveEditing
}

/** Expandable tree: Topic → Competency → Learning objective. */
export function CurriculumTree({ topics, expanded, onToggle, editing }: CurriculumTreeProps) {
  return (
    <ul className="divide-y divide-line">
      {topics.map((t) => (
        <TopicNode key={t.id} topic={t} open={expanded.has(t.id)} onToggle={() => onToggle(t.id)} editing={editing} />
      ))}
    </ul>
  )
}

function TopicNode({ topic, open, onToggle, editing }: { topic: CurriculumTopic; open: boolean; onToggle: () => void; editing?: ObjectiveEditing }) {
  const panelId = useId()
  const objectiveCount = topic.competencies.reduce((n, c) => n + c.objectives.length, 0)
  const Icon = open ? ChevronDown : ChevronRight
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2"
      >
        <Icon className="size-4 shrink-0 text-ink-3" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-3">Topic</span>
          <span className="block font-medium text-ink">{topic.name}</span>
          {topic.description && <span className="block text-sm text-ink-3">{topic.description}</span>}
        </span>
        <span className="tabular shrink-0 text-xs text-ink-3">
          {topic.competencies.length} {topic.competencies.length === 1 ? 'competency' : 'competencies'} · {objectiveCount}{' '}
          {objectiveCount === 1 ? 'objective' : 'objectives'}
        </span>
      </button>
      {open && (
        <ul id={panelId} className="space-y-3 px-5 pb-4 sm:pl-12">
          {topic.competencies.map((c) => (
            <CompetencyNode key={c.id} competency={c} editing={editing} />
          ))}
        </ul>
      )}
    </li>
  )
}

function CompetencyNode({ competency, editing }: { competency: CurriculumCompetency; editing?: ObjectiveEditing }) {
  const [adding, setAdding] = useState(false)
  const [code, setCode] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || !code.trim() || !text.trim()) return
    setBusy(true)
    try {
      await editing.onAdd(competency, code.trim(), text.trim())
      setCode('')
      setText('')
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-lg border border-line bg-surface-2 p-3.5">
      <div className="flex items-start gap-2.5">
        <Target className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Competency</p>
          <p className="text-sm font-medium text-ink">{competency.name}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-ink-3">Learning objectives</p>
      {competency.objectives.length === 0 && !adding && (
        <p className="mt-1.5 text-sm text-ink-3">{editing ? 'None yet. Add the official objective your school uses for this.' : 'None added yet.'}</p>
      )}
      <ul className="mt-1.5 space-y-1.5">
        {competency.objectives.map((o) => (
          <li key={o.id} className={cn('flex flex-col gap-1 rounded-md bg-surface px-3 py-2 text-sm sm:flex-row sm:items-baseline sm:gap-3')}>
            <code className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-ink-2">{o.code}</code>
            <span className="flex-1 text-ink">{o.text}</span>
            {o.schoolAdded && <span className="shrink-0 text-xs font-medium text-brand-ink">Your school</span>}
            {o.schoolAdded && editing && (
              <button
                type="button"
                onClick={() => void editing.onRemove(competency, o.id)}
                className="shrink-0 self-start rounded p-1 text-ink-3 hover:bg-surface-3 hover:text-bad-ink sm:self-auto"
                aria-label={`Remove objective ${o.code}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editing && !adding && (
        <button type="button" onClick={() => setAdding(true)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline">
          <Plus className="size-4" aria-hidden />
          Add objective
        </button>
      )}
      {editing && adding && (
        <form onSubmit={submit} className="mt-2 grid gap-2 rounded-md border border-line bg-surface p-3 sm:grid-cols-[8rem_1fr]">
          <input
            aria-label="Objective code"
            placeholder="Code, e.g. P6.M.3.1"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={40}
            className="h-9 rounded-md border border-line bg-surface-2 px-2 font-mono text-xs text-ink"
          />
          <input
            aria-label="Objective text"
            placeholder="The objective, as worded in your official document"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            className="h-9 rounded-md border border-line bg-surface-2 px-2 text-sm text-ink"
          />
          <p className="text-xs text-ink-3 sm:col-span-2">Only your school sees objectives you add. Add only text your school has the right to use.</p>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy || !code.trim() || !text.trim()} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Saving…' : 'Save objective'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-md px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2">
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
