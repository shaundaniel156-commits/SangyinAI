import { Check, FileUp, Loader2, Sparkles, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { SelectField, TextArea, TextField } from '../../../components/ui/Field'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SegmentedControl } from '../../../components/ui/Tabs'
import { useAiAssessments } from '../../../context/AiAssessmentsContext'
import { useSession } from '../../../context/SessionContext'
import { useToast } from '../../../context/ToastContext'
import { classesInScope } from '../../../data/selectors'
import {
  DIFFICULTY_LABEL,
  QUESTION_TYPE_LABEL,
  availableQuestionCount,
  detectGaps,
  generateAssessmentDraft,
  studentsWithGaps,
} from '../../../lib/aiAssessment'
import { cn } from '../../../lib/cn'
import type { AiDifficulty, AiQuestionType, Subject } from '../../../types'
import { WorkflowSteps } from './WorkflowSteps'

const SUBJECTS: Subject[] = ['Mathematics', 'English']
const COUNTS = ['5', '8', '10'] as const
const DIFFICULTIES: (AiDifficulty | 'mixed')[] = ['foundation', 'mixed', 'core', 'stretch']
const TYPES: AiQuestionType[] = ['multiple_choice', 'short_answer']
const GENERATION_STEPS = ['Reading report data', 'Mapping gaps to curriculum objectives', 'Writing questions and answer keys', 'Preparing the draft for your review']

const inAWeek = () => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)

/** Pre-select the worst gap (the one with most students needing support). */
function defaultSelection(classId: string, subject: Subject): string[] {
  const top = detectGaps(classId, subject)[0]
  return top && top.needsSupport > 0 ? [top.competency] : []
}

export function AiAssessmentNewPage() {
  const { role } = useSession()
  const { create } = useAiAssessments()
  const { notify } = useToast()
  const navigate = useNavigate()
  const classes = classesInScope(role)

  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [subject, setSubject] = useState<Subject>('Mathematics')
  const [selected, setSelected] = useState<string[]>(() => defaultSelection(classes[0]?.id ?? '', 'Mathematics'))
  const [includeDeveloping, setIncludeDeveloping] = useState(false)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [count, setCount] = useState<(typeof COUNTS)[number]>('8')
  const [difficulty, setDifficulty] = useState<AiDifficulty | 'mixed'>('mixed')
  const [types, setTypes] = useState<AiQuestionType[]>(TYPES)
  const [dueDate, setDueDate] = useState(inAWeek)
  const [notes, setNotes] = useState('')
  const [fileName, setFileName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const gaps = useMemo(() => detectGaps(classId, subject), [classId, subject])
  const candidates = useMemo(() => studentsWithGaps(classId, selected, includeDeveloping), [classId, selected, includeDeveloping])
  const recipients = candidates.filter((s) => !excluded.has(s.id))
  const available = availableQuestionCount(selected, types)
  const canGenerate = selected.length > 0 && recipients.length > 0 && types.length > 0 && available > 0

  // Walk through the progress messages while the (simulated) model works.
  useEffect(() => {
    if (!generating) return
    const t = window.setInterval(() => setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1)), 650)
    return () => window.clearInterval(t)
  }, [generating])

  const changeScope = (nextClass: string, nextSubject: Subject) => {
    setClassId(nextClass)
    setSubject(nextSubject)
    setSelected(defaultSelection(nextClass, nextSubject))
    setExcluded(new Set())
  }

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setFileName(file.name)
    setNotes((n) => (n.trim() ? `${n.trim()}\n\n` : '') + text.slice(0, 4000))
    e.target.value = ''
  }

  const generate = async () => {
    setGenStep(0)
    setGenerating(true)
    const draft = await generateAssessmentDraft({
      classId,
      subject,
      competencies: selected,
      studentIds: recipients.map((s) => s.id),
      questionCount: Number(count),
      difficulty,
      types,
      dueDate,
      reportNotes: notes.trim(),
    })
    const saved = create(draft)
    notify('Draft ready for your review', { description: `${saved.questions.length} questions for ${saved.studentIds.length} students.` })
    navigate(`/ai-assessments/${saved.id}`)
  }

  if (generating) return <GeneratingView step={genStep} />

  return (
    <>
      <PageHeader
        back={{ to: '/ai-assessments', label: 'AI Assessment Builder' }}
        title="Generate an assessment from report data"
        description="Submit your class results and notes. The AI drafts targeted questions for the competency gaps it finds — nothing reaches students or parents until you approve it."
      />
      <WorkflowSteps current={0} className="mb-8" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="1. Report data" description="Recorded results from assessments and diagnostics for the class you choose." />
            <CardBody className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Class"
                  value={classId}
                  onChange={(e) => changeScope(e.target.value, subject)}
                  options={classes.map((c) => ({ value: c.id, label: c.name }))}
                />
                <SelectField
                  label="Subject"
                  value={subject}
                  onChange={(e) => changeScope(classId, e.target.value as Subject)}
                  options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink">Competency gaps found — choose which to target</legend>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {gaps.map((g) => {
                    const on = selected.includes(g.competency)
                    return (
                      <li key={g.competency}>
                        <label className={cn('flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors', on ? 'bg-brand-soft' : 'hover:bg-surface-2')}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              setSelected((s) => toggle(s, g.competency))
                              setExcluded(new Set())
                            }}
                            className="size-4 rounded border-line-strong accent-brand-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">{g.competency}</span>
                            <span className="mt-1.5 flex items-center gap-2">
                              <span className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                                <span
                                  className={cn('block h-full rounded-full', g.average < 60 ? 'bg-bad' : g.average < 70 ? 'bg-warn' : 'bg-good')}
                                  style={{ width: `${g.average}%` }}
                                />
                              </span>
                              <span className="tabular text-xs text-ink-3">Class mastery {g.average}%</span>
                            </span>
                          </span>
                          <span className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                            {g.needsSupport > 0 && <StatusBadge tone="bad">{g.needsSupport} need support</StatusBadge>}
                            <StatusBadge tone="warn">{g.developing} developing</StatusBadge>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="2. Your report & notes" description="Optional. Paste a report, observations or anything the AI should take into account." />
            <CardBody className="space-y-3">
              <TextArea
                label="Report notes"
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Many learners mix up the order in a ratio. Word problems with money were the weakest items in last week's quiz."
              />
              <div className="flex flex-wrap items-center gap-3">
                <input ref={fileRef} type="file" accept=".txt,.csv,text/plain,text/csv" className="sr-only" onChange={onFile} tabIndex={-1} />
                <Button variant="secondary" size="sm" icon={<FileUp className="size-4" aria-hidden />} onClick={() => fileRef.current?.click()}>
                  Upload report file
                </Button>
                <span className="text-xs text-ink-3">{fileName ? `Added: ${fileName}` : '.txt or .csv — its text is added to your notes'}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="3. Assessment settings" />
            <CardBody className="space-y-5">
              <div className="flex flex-wrap gap-x-8 gap-y-5">
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Number of questions</p>
                  <SegmentedControl label="Number of questions" value={count} onChange={setCount} options={COUNTS.map((c) => ({ id: c, label: c }))} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Difficulty</p>
                  <SegmentedControl label="Difficulty" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES.map((d) => ({ id: d, label: DIFFICULTY_LABEL[d] }))} />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink">Question types</legend>
                  <div className="flex flex-wrap gap-4">
                    {TYPES.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm text-ink-2">
                        <input type="checkbox" checked={types.includes(t)} onChange={() => setTypes((x) => toggle(x, t))} className="size-4 rounded border-line-strong accent-brand-600" />
                        {QUESTION_TYPE_LABEL[t]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <TextField label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-48" />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader
              title="Who receives it"
              description={`${recipients.length} of ${candidates.length} students with these gaps`}
              icon={<Users className="size-5" aria-hidden />}
            />
            <div className="border-b border-line px-6 py-3">
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={includeDeveloping}
                  onChange={(e) => {
                    setIncludeDeveloping(e.target.checked)
                    setExcluded(new Set())
                  }}
                  className="size-4 rounded border-line-strong accent-brand-600"
                />
                Also include students who are still developing
              </label>
            </div>
            {candidates.length === 0 ? (
              <p className="px-6 py-5 text-sm text-ink-3">Choose at least one gap to see the students who need it.</p>
            ) : (
              <ul className="max-h-72 divide-y divide-line overflow-y-auto">
                {candidates.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-6 py-2.5 hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={!excluded.has(s.id)}
                        onChange={() =>
                          setExcluded((ex) => {
                            const next = new Set(ex)
                            if (next.has(s.id)) next.delete(s.id)
                            else next.add(s.id)
                            return next
                          })
                        }
                        className="size-4 rounded border-line-strong accent-brand-600"
                      />
                      <span className="flex-1 truncate text-sm text-ink">{s.name}</span>
                      <span className="tabular text-xs text-ink-3">{s.average}%</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <ul className="space-y-2 text-sm text-ink-2">
                <SummaryLine ok={selected.length > 0}>{selected.length ? `${selected.length} gap${selected.length > 1 ? 's' : ''}: ${selected.join(', ')}` : 'No gap selected'}</SummaryLine>
                <SummaryLine ok={recipients.length > 0}>{recipients.length} student{recipients.length === 1 ? '' : 's'} selected</SummaryLine>
                <SummaryLine ok={types.length > 0 && available > 0}>
                  {Math.min(Number(count), available)} questions · {DIFFICULTY_LABEL[difficulty]}
                </SummaryLine>
              </ul>
              {selected.length > 0 && available < Number(count) && (
                <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">
                  Only {available} questions are available for {selected.length === 1 ? 'this gap' : 'these gaps'}. Select another gap or question type for a longer assessment.
                </p>
              )}
              <Button size="lg" className="w-full" disabled={!canGenerate} onClick={generate} icon={<Sparkles className="size-4" aria-hidden />}>
                Generate draft
              </Button>
              <p className="text-xs text-ink-3">Prototype: the AI is simulated with a demo question bank. You review every question before anything is sent.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}

function SummaryLine({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className={cn('mt-0.5 size-4 shrink-0', ok ? 'text-good' : 'text-ink-3 opacity-40')} aria-hidden />
      <span className={cn(!ok && 'text-ink-3')}>{children}</span>
    </li>
  )
}

function GeneratingView({ step }: { step: number }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center" role="status" aria-live="polite">
      <span className="relative grid size-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" aria-hidden />
        <span className="relative grid size-16 place-items-center rounded-full bg-brand-600 text-white shadow-[0_0_40px_rgba(91,147,230,0.5)]">
          <Sparkles className="size-7" aria-hidden />
        </span>
      </span>
      <h1 className="mt-8 text-2xl font-bold tracking-tight text-ink">Drafting your assessment…</h1>
      <p className="mt-2 text-sm text-ink-3">This usually takes a few seconds.</p>
      <ol className="mt-8 w-full space-y-3 text-left">
        {GENERATION_STEPS.map((label, i) => (
          <li key={label} className={cn('flex items-center gap-3 text-sm transition-opacity', i > step && 'opacity-40')}>
            {i < step ? (
              <Check className="size-4 text-good" aria-hidden />
            ) : i === step ? (
              <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden />
            ) : (
              <span className="size-4 rounded-full border border-line-strong" aria-hidden />
            )}
            <span className={i === step ? 'font-medium text-ink' : 'text-ink-2'}>{label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
