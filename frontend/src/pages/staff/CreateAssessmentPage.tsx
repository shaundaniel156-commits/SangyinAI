import { Check, Info, Plus, Sparkles } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAiAssessments } from '../../context/AiAssessmentsContext'
import { useLiveData } from '../../context/LiveDataContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { getClass } from '../../data/classes'
import { FRAMEWORK_LABEL } from '../../data/curriculum'
import { classesInScope } from '../../data/selectors'
import { COMPETENCIES, getStudentsByClass } from '../../data/students'
import { QUESTION_TYPE_LABEL, generateAssessmentDraft, subjectsForClass } from '../../lib/aiAssessment'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { subjectChoices } from '../../lib/subjects'
import type { AiQuestionType, Assessment, AssessmentType, Subject } from '../../types'

const TYPES: AssessmentType[] = ['Test', 'Quiz', 'Assignment', 'Teacher Observation']
// How the class does it: on paper (the teacher enters the marks) or online (students answer in Sangyin).
type Mode = 'paper' | 'online'
const COUNTS = ['5', '8', '10', '15'] as const
const QUESTION_TYPES: AiQuestionType[] = ['multiple_choice', 'short_answer', 'written_work']
// What the server accepts (backend routes/assessments.ts and routes/aiAssessments.ts). Checked here before anything
// is saved, so a refused request never leaves a half-made assessment behind.
const MAX_AREAS = { paper: 20, online: 10 }
const MAX_STUDENTS_ONLINE = 200
const MAX_INSTRUCTIONS = 2000
const MAX_CURRICULUM_REFS = 20

export function CreateAssessmentPage() {
  const { role } = useSession()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { create } = useAiAssessments()
  const classes = classesInScope(role)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<AssessmentType>('Quiz')
  const [mode, setMode] = useState<Mode>('paper')
  const [subject, setSubject] = useState<Subject>('Mathematics')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [topics, setTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [maxScore, setMaxScore] = useState('')
  const [count, setCount] = useState<(typeof COUNTS)[number]>('10')
  const [questionTypes, setQuestionTypes] = useState<AiQuestionType[]>(['multiple_choice', 'short_answer'])
  const [instructions, setInstructions] = useState('')
  // What the button says while working (online: writing the questions, then saving).
  const [working, setWorking] = useState('')
  const { live, refresh } = useLiveData()
  const max = Number(maxScore || (type === 'Teacher Observation' ? 10 : 20))
  // An observation is the teacher's own rating: there is nothing for the student to answer.
  const online = mode === 'online' && type !== 'Teacher Observation'

  const cls = getClass(classId)
  const students = getStudentsByClass(classId)
  const subjects = subjectChoices(subjectsForClass(classId), [subject])
  // Areas already in the students' records for this subject, then any the teacher has added here.
  const known = COMPETENCIES.filter((c) => c.subject === subject).map((c) => c.name)
  const areas = [...known, ...topics.filter((t) => !known.includes(t))]

  const maxAreas = online ? MAX_AREAS.online : MAX_AREAS.paper
  const tooManyAreas = () => notify(`Up to ${maxAreas} areas`, { tone: 'info', description: online ? 'An online assessment can cover up to 10 areas. Untick one to add another.' : 'An assessment can cover up to 20 areas. Untick one to add another.' })
  const toggleTopic = (name: string) => {
    if (!topics.includes(name) && topics.length >= maxAreas) return tooManyAreas()
    setTopics((t) => (t.includes(name) ? t.filter((x) => x !== name) : [...t, name]))
  }
  const addTopics = () => {
    const typed = topicInput.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
    if (!typed.length) return
    const fresh = typed.filter((t) => !topics.some((x) => x.toLowerCase() === t.toLowerCase()))
    if (topics.length + fresh.length > maxAreas) return tooManyAreas()
    setTopics((ts) => [...ts, ...fresh])
    setTopicInput('')
  }
  const onTopicKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTopics()
    }
  }

  // Online: the AI writes the questions for the chosen areas, then the assessment and its questions are saved and
  // the teacher reviews them. Nothing reaches the class until they press Approve & send there.
  const createOnline = async () => {
    if (!topics.length) return notify('Choose what it covers', { tone: 'info', description: 'Pick or add at least one area, so the AI knows what to ask about.' })
    if (topics.length > MAX_AREAS.online) return notify(`Up to ${MAX_AREAS.online} areas`, { tone: 'info', description: `An online assessment can cover up to ${MAX_AREAS.online} areas; ${topics.length} are chosen. Untick some first.` })
    if (!students.length) return notify('This class has no students yet', { tone: 'info' })
    if (students.length > MAX_STUDENTS_ONLINE) return notify(`Up to ${MAX_STUDENTS_ONLINE} students`, { tone: 'info', description: `An online assessment can go to up to ${MAX_STUDENTS_ONLINE} students at a time; this class has ${students.length}.` })
    if (!questionTypes.length) return notify('Choose at least one question type', { tone: 'info' })
    if (instructions.trim().length > MAX_INSTRUCTIONS) return notify('Instructions are too long', { tone: 'info', description: `Up to ${MAX_INSTRUCTIONS.toLocaleString()} characters; shorten them first.` })
    setWorking('Writing the questions…')
    try {
      const draft = await generateAssessmentDraft({
        classId,
        subject,
        competencies: topics,
        studentIds: students.map((s) => s.id),
        questionCount: Number(count),
        difficulty: 'mixed',
        types: questionTypes,
        dueDate: date,
        reportNotes: instructions.trim(),
      })
      if (!draft.questions.length) {
        return notify('The questions could not be written', { tone: 'info', description: 'The AI is busy and the question bank has nothing for these areas yet. Nothing was saved — try again in a few minutes.' })
      }
      setWorking('Saving…')
      const made = await api<Assessment>('/assessments', {
        body: { title: title.trim(), type, subject, classId, date, maxScore: draft.questions.length, topics, status: 'scheduled' },
      })
      const saved = await create({
        ...draft,
        // Found from the areas automatically; the server takes up to 20.
        curriculumRefs: (draft.curriculumRefs ?? []).slice(0, MAX_CURRICULUM_REFS),
        title: title.trim(),
        dueDate: date,
        assessmentId: made.id,
        oneAttempt: true,
        ...(instructions.trim() ? { messageToStudents: instructions.trim() } : {}),
      })
      await refresh()
      notify('Questions ready for your review', { description: 'Check them, then press Approve & send: the class receives the assessment and each score is entered here as students finish.' })
      navigate(`/ai-assessments/${saved.id}`)
    } catch (error) {
      notify('Assessment not saved', { tone: 'info', description: (error as Error).message })
    } finally {
      setWorking('')
    }
  }

  const submit = async (e: FormEvent, draft = false) => {
    e.preventDefault()
    if (!live) {
      notify(draft ? 'Draft saved for preview' : 'Assessment created for preview', {
        description: 'Offline — not saved. Sign in while connected to save assessments.',
      })
      navigate('/assessments')
      return
    }
    if (!title.trim()) return notify('Add a title first', { tone: 'info' })
    if (topics.length > MAX_AREAS.paper) return notify(`Up to ${MAX_AREAS.paper} areas`, { tone: 'info', description: `An assessment can cover up to ${MAX_AREAS.paper} areas; ${topics.length} are chosen. Untick some first.` })
    if (online && !draft) return createOnline()
    setWorking('Saving…')
    try {
      await api('/assessments', { body: { title: title.trim(), type, subject, classId, date, maxScore: max, topics, status: draft ? 'draft' : 'scheduled' } })
      await refresh()
      notify(draft ? 'Draft saved' : 'Assessment created', { description: `${title.trim()} · ${cls?.name ?? ''}` })
      navigate('/assessments')
    } catch (error) {
      notify('Assessment not saved', { tone: 'info', description: (error as Error).message })
    } finally {
      setWorking('')
    }
  }

  return (
    <>
      <PageHeader back={{ to: '/assessments', label: 'Assessments' }} title="Create assessment" description="Set up a test, quiz, assignment or teacher observation and link it to curriculum areas." />
      <form onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Assessment details" />
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Title"
                className="sm:col-span-2"
                placeholder="e.g. Ratio and Proportion Quiz"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-sm font-medium text-ink">Type</legend>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={type === t}
                      onClick={() => setType(t)}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                        type === t ? 'border-brand-500 bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </fieldset>
              {type !== 'Teacher Observation' && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-1.5 text-sm font-medium text-ink">How will students do it?</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        { id: 'paper', label: 'On paper', detail: 'You mark it and enter each student’s score.' },
                        { id: 'online', label: 'Online, in Sangyin', detail: 'The AI writes the questions; students answer on their own account and are marked automatically.' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={mode === m.id}
                        onClick={() => setMode(m.id)}
                        className={cn('rounded-lg border px-3 py-2.5 text-left transition-colors', mode === m.id ? 'border-brand-500 bg-brand-soft' : 'border-line hover:bg-surface-2')}
                      >
                        <span className={cn('block text-sm font-medium', mode === m.id ? 'text-brand-ink' : 'text-ink')}>{m.label}</span>
                        <span className="mt-0.5 block text-xs text-ink-3">{m.detail}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <SelectField
                label="Class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
              <SelectField
                label="Subject"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value as Subject)
                  setTopics([])
                }}
                options={subjects.map((s) => ({ value: s, label: s }))}
              />
              <TextField label={online ? 'Date (due)' : 'Date'} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              {online ? (
                <SelectField
                  label="Number of questions"
                  hint="One mark each: this is the maximum score."
                  value={count}
                  onChange={(e) => setCount(e.target.value as (typeof COUNTS)[number])}
                  options={COUNTS.map((c) => ({ value: c, label: c }))}
                />
              ) : (
                <TextField label={type === 'Teacher Observation' ? 'Rating scale (max)' : 'Maximum score'} type="number" min={1} max={1000} value={maxScore || String(max)} onChange={(e) => setMaxScore(e.target.value)} />
              )}
              {online && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-1.5 text-sm font-medium text-ink">Question types</legend>
                  <div className="flex flex-wrap gap-4">
                    {QUESTION_TYPES.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm text-ink-2">
                        <input
                          type="checkbox"
                          checked={questionTypes.includes(t)}
                          onChange={() => setQuestionTypes((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}
                          className="size-4 rounded border-line-strong accent-brand-600"
                        />
                        {QUESTION_TYPE_LABEL[t]}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-3">Written work is done on paper and uploaded as a photo, which the AI marks. A photo it cannot mark waits for you and is not counted in the score.</p>
                </fieldset>
              )}
              <TextArea
                label={online ? 'Instructions for students (optional)' : 'Instructions (optional)'}
                className="sm:col-span-2"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={MAX_INSTRUCTIONS}
                hint={`Up to ${MAX_INSTRUCTIONS.toLocaleString()} characters${instructions.length > MAX_INSTRUCTIONS - 200 ? ` (${instructions.length.toLocaleString()} used)` : ''}.`}
                placeholder={online ? 'Shown to students when they open the assessment, e.g. “Work alone. Show your working on paper before you answer.”' : 'Notes for learners or for recording results…'}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Curriculum areas assessed"
              description={cls ? `Framework: ${FRAMEWORK_LABEL[cls.framework]} · ${cls.level}` : undefined}
            />
            <CardBody>
              <p className="mb-3 text-sm text-ink-2">
                {online ? 'Choose or add the areas this assessment covers. The AI writes the questions on these, and results are mapped to them.' : 'Select the competency areas this assessment covers. Results will be mapped to these areas.'}{' '}
                Up to {maxAreas} areas ({topics.length} chosen).
              </p>
              <div className="flex flex-wrap gap-2">
                {areas.map((name) => {
                  const active = topics.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTopic(name)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        active ? 'border-brand-500 bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2',
                      )}
                    >
                      {active && <Check className="size-3.5" aria-hidden />}
                      {name}
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 flex items-end gap-2">
                <TextField
                  label="Add an area"
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
              <p className="mt-3 text-xs text-ink-3">The areas listed are the ones in your students’ records for this subject. Type any other and press Add.</p>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="xl:sticky xl:top-24">
            <CardHeader title="Summary" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <SummaryRow label="Title" value={title || '—'} />
                <SummaryRow label="Type" value={type} />
                <SummaryRow label="Done" value={online ? 'Online, in Sangyin' : 'On paper'} />
                <SummaryRow label="Class" value={cls?.name ?? '—'} />
                <SummaryRow label="Students" value={online && students.length > MAX_STUDENTS_ONLINE ? `${students.length} (online: up to ${MAX_STUDENTS_ONLINE})` : String(cls?.studentCount ?? 0)} />
                {online && <SummaryRow label="Questions" value={count} />}
                <SummaryRow label="Areas" value={topics.length ? topics.join(', ') : 'None selected'} />
              </dl>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-info-soft p-3 text-sm text-brand-ink">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  {online
                    ? 'The AI writes the questions and you review them. When you approve, every student in the class receives the assessment, does it once, and is marked straight away. Each score is entered here by itself and updates the student’s competency profile.'
                    : 'Once scores are entered, results update each student’s competency profile and may produce new teaching guidance for your review.'}
                </p>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <Button type="submit" disabled={working !== ''} icon={online ? <Sparkles className="size-4" aria-hidden /> : undefined}>
                  {working || (online ? 'Write the questions' : 'Create assessment')}
                </Button>
                {!online && (
                  <Button variant="secondary" disabled={working !== ''} onClick={(e) => submit(e, true)}>
                    Save as draft
                  </Button>
                )}
              </div>
              {!live && <DemoNotice className="mt-4">Offline — assessments are not saved. Sign in while connected to save them.</DemoNotice>}
            </CardBody>
          </Card>
        </div>
      </form>
    </>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}
