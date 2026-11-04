import { ArrowLeft, ArrowRight, Check, FileSearch, FileText, FileUp, Loader2, Plus, SendHorizontal, Sparkles, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ButtonLink } from '../../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { SelectField, TextArea, TextField, inputClasses } from '../../../components/ui/Field'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { SegmentedControl } from '../../../components/ui/Tabs'
import { useAiAssessments } from '../../../context/AiAssessmentsContext'
import { useLiveData } from '../../../context/LiveDataContext'
import { useSession } from '../../../context/SessionContext'
import { useToast } from '../../../context/ToastContext'
import { getStudentsByClass } from '../../../data/students'
import { classesInScope } from '../../../data/selectors'
import {
  DIFFICULTY_LABEL,
  QUESTION_TYPE_LABEL,
  availableQuestionCount,
  detectGaps,
  generateAssessmentDraft,
  studentsWithGaps,
  subjectsForClass,
  type AiDraft,
} from '../../../lib/aiAssessment'
import { cn } from '../../../lib/cn'
import { formatDate } from '../../../lib/format'
import { subjectChoices } from '../../../lib/subjects'
import type { AiDifficulty, AiQuestionType, Subject } from '../../../types'
import { WorkflowSteps } from './WorkflowSteps'

const SUBJECTS: Subject[] = ['Mathematics', 'English']
const COUNTS = ['5', '8', '10'] as const
const DIFFICULTIES: (AiDifficulty | 'mixed')[] = ['foundation', 'mixed', 'core', 'stretch']
const TYPES: AiQuestionType[] = ['multiple_choice', 'short_answer', 'written_work']
const GENERATION_STEPS = ['Reading your report data', 'Mapping the gaps to curriculum objectives', 'Writing the questions and answer keys', 'Writing the teaching plan']

/** One turn in the conversation with the AI, shown after "Generate assessment". */
interface ChatMessage {
  id: number
  role: 'user' | 'ai'
  text: string
  /** AI turns: still working. */
  thinking?: boolean
  /** AI turns: the assessment it drafted, once ready. */
  draft?: AiDraft
}

/** The teacher's request, in words, from the form. */
function describeRequest(r: { className: string; subject: string; topics: string[]; students: number; count: number; difficulty: AiDifficulty | 'mixed'; types: AiQuestionType[]; dueDate: string; notes: string }): string {
  const lines = [
    `Draft a ${r.subject} assessment for ${r.className} on ${r.topics.join(', ')}.`,
    `${r.count} questions, ${DIFFICULTY_LABEL[r.difficulty].toLowerCase()} difficulty, ${r.types.map((t) => QUESTION_TYPE_LABEL[t].toLowerCase()).join(' and ')}, for ${r.students} student${r.students === 1 ? '' : 's'}${r.dueDate ? `, due ${formatDate(r.dueDate)}` : ''}.`,
  ]
  if (r.notes) lines.push(`Notes: ${r.notes}`)
  return lines.join('\n')
}

/** The AI's reply: what it drafted and why (its rationale), the plan in brief, and what to do next. */
function describeDraft(draft: AiDraft, className: string): string {
  const n = draft.questions.length
  const s = draft.studentIds.length
  const parts = [`Here is “${draft.title}”: ${n} question${n === 1 ? '' : 's'} for ${s} student${s === 1 ? '' : 's'} in ${className}, on ${draft.competencies.join(', ')}.`]
  if (draft.source === 'offline') parts.push('I could not reach the AI service just now, so these questions come from the reviewed question bank and the teaching plan is a general one. Reply “try again” in a few minutes for questions written for this class.')
  parts.push(...draft.rationale.filter((line) => !line.startsWith('Prepared offline')))
  if (draft.teachingPlan) parts.push(`Teaching plan: ${draft.teachingPlan.overview}`)
  parts.push('Open it to read every question and the full teaching plan, change anything, then approve and send. Or reply below with what to change — for example “make them easier” or “add a word problem about money”.')
  return parts.join('\n\n')
}

const inAWeek = () => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)

/** The class's subjects or course units, then the school's standard subjects; Mathematics and English when there are none. */
function subjectsFor(classId: string): Subject[] {
  const own = subjectChoices(subjectsForClass(classId))
  return own.length ? own : SUBJECTS
}

/** Automatic: pre-select every topic in the results where a student needs support. */
function defaultSelection(classId: string, subject: Subject): string[] {
  return detectGaps(classId, subject).filter((g) => g.needsSupport > 0).map((g) => g.competency)
}

type TopicMode = 'auto' | 'manual'

export function AiAssessmentNewPage() {
  const { role } = useSession()
  const { create } = useAiAssessments()
  const { notify } = useToast()
  const navigate = useNavigate()
  const classes = classesInScope(role)

  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [subject, setSubject] = useState<Subject>(() => (subjectsFor(classes[0]?.id ?? '').includes('Mathematics') ? 'Mathematics' : subjectsFor(classes[0]?.id ?? '')[0] ?? 'Mathematics'))
  // Automatic: topics detected from the class's exam results; manual: topics the teacher types.
  const [mode, setMode] = useState<TopicMode>('auto')
  const [autoSelected, setAutoSelected] = useState<string[]>(() => defaultSelection(classes[0]?.id ?? '', subject))
  const [manualTopics, setManualTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState('')
  const selected = mode === 'auto' ? autoSelected : manualTopics
  const { live } = useLiveData()
  const [includeDeveloping, setIncludeDeveloping] = useState(false)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [count, setCount] = useState<(typeof COUNTS)[number]>('8')
  const [difficulty, setDifficulty] = useState<AiDifficulty | 'mixed'>('mixed')
  const [types, setTypes] = useState<AiQuestionType[]>(TYPES)
  const [dueDate, setDueDate] = useState(inAWeek)
  const [notes, setNotes] = useState('')
  const [fileName, setFileName] = useState('')
  // The conversation with the AI, once "Generate assessment" is pressed; empty while the form is shown.
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  // Changes the teacher asked for in replies; each new version is drafted with all of them.
  const [followUps, setFollowUps] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const gaps = useMemo(() => detectGaps(classId, subject), [classId, subject])
  // Typed topics have no results to pick out the students who need them, so the whole class is offered.
  const candidates = useMemo(
    () => (mode === 'manual' ? getStudentsByClass(classId) : studentsWithGaps(classId, subject, selected, includeDeveloping)),
    [mode, classId, subject, selected, includeDeveloping],
  )
  const recipients = candidates.filter((s) => !excluded.has(s.id))
  const available = availableQuestionCount(selected, types)
  // Online, the AI writes the questions; the local bank only matters offline.
  const canGenerate = selected.length > 0 && recipients.length > 0 && types.length > 0 && (live || available > 0)

  const changeScope = (nextClass: string, nextSubject: Subject) => {
    // A class may not have the current subject (e.g. moving from P6 to a university cohort).
    const options = subjectsFor(nextClass)
    const subjectToUse = options.includes(nextSubject) ? nextSubject : (options[0] ?? nextSubject)
    setClassId(nextClass)
    setSubject(subjectToUse)
    setAutoSelected(defaultSelection(nextClass, subjectToUse))
    setExcluded(new Set())
  }

  const addTopics = () => {
    // Several topics can be typed at once, separated by commas or semicolons.
    const typed = topicInput.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
    if (!typed.length) return
    setManualTopics((ts) => [...ts, ...typed.filter((t) => !ts.some((x) => x.toLowerCase() === t.toLowerCase()))])
    setTopicInput('')
  }
  const onTopicKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTopics()
    }
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

  const className = classes.find((c) => c.id === classId)?.name ?? 'the class'

  // Asks the AI: the first time from the form, afterwards with the teacher's reply added to the notes.
  const ask = async (followUp?: string) => {
    const asked = followUp ? [...followUps, followUp] : followUps
    setFollowUps(asked)
    const userText = followUp ?? describeRequest({ className, subject, topics: selected, students: recipients.length, count: Number(count), difficulty, types, dueDate, notes: notes.trim() })
    const aiId = Date.now()
    setChat((c) => [...c, { id: aiId - 1, role: 'user', text: userText }, { id: aiId, role: 'ai', text: '', thinking: true }])
    setBusy(true)
    const draft = await generateAssessmentDraft({
      classId,
      subject,
      competencies: selected,
      studentIds: recipients.map((s) => s.id),
      questionCount: Number(count),
      difficulty,
      types,
      dueDate,
      reportNotes: [notes.trim(), ...asked.map((f) => `Teacher's follow-up request: ${f}`)].filter(Boolean).join('\n\n'),
    })
    setChat((c) => c.map((m) => (m.id === aiId ? { ...m, text: describeDraft(draft, className), draft, thinking: false } : m)))
    setBusy(false)
  }

  // "Open and review": saves the version the teacher chose and opens it.
  const open = async (draft: AiDraft) => {
    try {
      const saved = await create(draft)
      notify('Assessment ready for your review', { description: `${saved.questions.length} questions for ${saved.studentIds.length} students.` })
      navigate(`/ai-assessments/${saved.id}`)
    } catch (error) {
      notify('Assessment not saved', { tone: 'info', description: (error as Error).message })
    }
  }

  if (chat.length) {
    return (
      <ChatView
        messages={chat}
        busy={busy}
        onReply={(text) => void ask(text)}
        onOpen={(draft) => void open(draft)}
        onBack={() => {
          setChat([])
          setFollowUps([])
        }}
      />
    )
  }

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
                  label="Subject or course unit"
                  value={subject}
                  onChange={(e) => changeScope(classId, e.target.value as Subject)}
                  options={subjectsFor(classId).map((s) => ({ value: s, label: s }))}
                />
              </div>

              <fieldset>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <legend className="text-sm font-medium text-ink">Topics to target</legend>
                  <SegmentedControl<TopicMode>
                    label="How to choose topics"
                    value={mode}
                    onChange={(m) => {
                      setMode(m)
                      setExcluded(new Set())
                    }}
                    options={[
                      { id: 'auto', label: 'Automatic' },
                      { id: 'manual', label: 'Type my own' },
                    ]}
                  />
                </div>

                {mode === 'manual' ? (
                  <div className="space-y-3">
                    <div className="flex items-end gap-2">
                      <TextField
                        label="Topic"
                        hideLabel
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={onTopicKey}
                        placeholder="e.g. Fractions, Word problems with money"
                        className="flex-1"
                      />
                      <Button variant="secondary" onClick={addTopics} disabled={!topicInput.trim()} icon={<Plus className="size-4" aria-hidden />}>
                        Add
                      </Button>
                    </div>
                    {manualTopics.length ? (
                      <ul className="flex flex-wrap gap-2">
                        {manualTopics.map((t) => (
                          <li key={t} className="inline-flex items-center gap-1 rounded-full border border-line bg-brand-soft py-1 pl-3 pr-1 text-sm font-medium text-brand-ink">
                            {t}
                            <button type="button" onClick={() => setManualTopics((ts) => ts.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded-full p-1 hover:bg-surface-3">
                              <X className="size-3.5" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-ink-3">Type a topic and press Enter or Add. Separate several with commas.</p>
                    )}
                  </div>
                ) : gaps.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-ink-3">
                    <p>No exam results for {subject} in this class yet, so there are no topics to detect.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ButtonLink to="/diagnostics/new" size="sm" variant="secondary" icon={<FileSearch className="size-4" aria-hidden />}>
                        Analyse exam results
                      </ButtonLink>
                      <Button size="sm" variant="secondary" onClick={() => setMode('manual')}>
                        Type my own topics
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-ink-3">
                      Detected from the class’s exam results. Topics where a student needs support are ticked; untick any you don’t want.
                    </p>
                    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                      {gaps.map((g) => {
                        const on = autoSelected.includes(g.competency)
                        return (
                          <li key={g.competency}>
                            <label className={cn('flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors', on ? 'bg-brand-soft' : 'hover:bg-surface-2')}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => {
                                  setAutoSelected((s) => toggle(s, g.competency))
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
                  </>
                )}
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
                  <p className="mt-2 text-xs text-ink-3">Written work is done on paper: the student uploads a photo and the AI marks it against the model answer. You can read every photo.</p>
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
              description={
                mode === 'manual'
                  ? `${recipients.length} of ${candidates.length} students in the class (untick any who don’t need it)`
                  : `${recipients.length} of ${candidates.length} students with these gaps`
              }
              icon={<Users className="size-5" aria-hidden />}
            />
            {mode === 'auto' && (
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
            )}
            {candidates.length === 0 ? (
              <p className="px-6 py-5 text-sm text-ink-3">
                {mode === 'manual' ? 'This class has no students yet.' : 'Choose at least one topic to see the students who need it.'}
              </p>
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
                <SummaryLine ok={types.length > 0 && (live || available > 0)}>
                  {live ? Number(count) : Math.min(Number(count), available)} questions · {DIFFICULTY_LABEL[difficulty]}
                </SummaryLine>
              </ul>
              {!live && selected.length > 0 && available < Number(count) && (
                <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink">
                  Only {available} questions are available for {selected.length === 1 ? 'this gap' : 'these gaps'}. Select another gap or question type for a longer assessment.
                </p>
              )}
              <Button size="lg" className="w-full" disabled={!canGenerate} onClick={() => void ask()} icon={<Sparkles className="size-4" aria-hidden />}>
                Generate assessment
              </Button>
              <p className="text-xs text-ink-3">Drafted by the AI (or the question bank when offline). You review every question before anything is sent.</p>
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

/** Reveals text a few characters at a time, like someone typing. */
function useTypewriter(text: string): string {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    setShown(0)
    if (!text) return
    const t = window.setInterval(() => setShown((n) => (n >= text.length ? n : n + 4)), 16)
    return () => window.clearInterval(t)
  }, [text])
  return text.slice(0, Math.min(shown, text.length))
}

interface ChatViewProps {
  messages: ChatMessage[]
  busy: boolean
  onReply: (text: string) => void
  onOpen: (draft: AiDraft) => void
  onBack: () => void
}

/** The conversation: the teacher's request, the AI's reply with the assessment attached, and a box to ask for changes. */
function ChatView({ messages, busy, onReply, onOpen, onBack }: ChatViewProps) {
  const [reply, setReply] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const send = () => {
    const text = reply.trim()
    if (!text || busy) return
    setReply('')
    onReply(text)
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 self-start text-sm text-ink-3 transition-colors hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Change the report data
      </button>
      <div className="flex-1 space-y-8 py-8">
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-line rounded-2xl bg-surface-2 px-5 py-3 text-[15px] leading-relaxed text-ink">{m.text}</p>
            </div>
          ) : (
            <AiTurn key={m.id} message={m} onOpen={onOpen} />
          ),
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="sticky bottom-4 flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg"
      >
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          disabled={busy}
          placeholder={busy ? 'The AI is working…' : 'Reply with changes, e.g. “make them easier” or “add a question about money”'}
          aria-label="Reply to the AI"
          className={cn(inputClasses, 'h-10 border-0 bg-transparent shadow-none focus:ring-0')}
        />
        <Button type="submit" size="sm" disabled={busy || !reply.trim()} icon={<SendHorizontal className="size-4" aria-hidden />}>
          Send
        </Button>
      </form>
      <p className="mt-3 text-center text-xs text-ink-3">Drafted by the AI (or the question bank when offline). You review every question before anything is sent.</p>
    </div>
  )
}

/** One reply from the AI: its working while it drafts, then its message typed out and the assessment attached. */
function AiTurn({ message: m, onOpen }: { message: ChatMessage; onOpen: (draft: AiDraft) => void }) {
  const shown = useTypewriter(m.text)
  const [step, setStep] = useState(0)
  const typing = shown.length < m.text.length

  useEffect(() => {
    if (!m.thinking) return
    const t = window.setInterval(() => setStep((n) => Math.min(n + 1, GENERATION_STEPS.length - 1)), 2500)
    return () => window.clearInterval(t)
  }, [m.thinking])

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
        <Sparkles className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {m.thinking ? (
          <p className="flex items-center gap-2 text-sm text-ink-3" role="status" aria-live="polite">
            <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden />
            {GENERATION_STEPS[step]}…
          </p>
        ) : (
          <>
            <p className="text-xs text-ink-3">{m.draft?.source === 'offline' ? 'From the question bank' : 'Written by the AI'} · read your report data, drafted questions and a teaching plan</p>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">
              {shown}
              {typing && (
                <span className="animate-pulse text-brand-600" aria-hidden>
                  ▍
                </span>
              )}
            </p>
            {m.draft && !typing && <DraftCard draft={m.draft} onOpen={() => onOpen(m.draft!)} />}
          </>
        )}
      </div>
    </div>
  )
}

/** The drafted assessment, attached to the AI's reply. */
function DraftCard({ draft, onOpen }: { draft: AiDraft; onOpen: () => void }) {
  const n = draft.questions.length
  const s = draft.studentIds.length
  return (
    <div className="mt-4 inline-flex max-w-full flex-col gap-3 rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{draft.title}</p>
          <p className="text-xs text-ink-3">
            {n} question{n === 1 ? '' : 's'} · {s} student{s === 1 ? '' : 's'} · {draft.subject} · {DIFFICULTY_LABEL[draft.difficulty]}
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onOpen} icon={<ArrowRight className="size-4" aria-hidden />}>
        Open and review
      </Button>
    </div>
  )
}
