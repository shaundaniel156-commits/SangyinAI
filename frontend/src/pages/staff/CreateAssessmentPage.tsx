import { Check, Info } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { getClass } from '../../data/classes'
import { FRAMEWORK_LABEL } from '../../data/curriculum'
import { classesInScope } from '../../data/selectors'
import { DEMO_COMPETENCIES } from '../../data/students'
import { cn } from '../../lib/cn'
import type { AssessmentType, Subject } from '../../types'

const TYPES: AssessmentType[] = ['Test', 'Quiz', 'Assignment', 'Teacher Observation']
const SUBJECTS: Subject[] = ['Mathematics', 'English']

export function CreateAssessmentPage() {
  const { role } = useSession()
  const navigate = useNavigate()
  const { notify } = useToast()
  const classes = classesInScope(role)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<AssessmentType>('Quiz')
  const [subject, setSubject] = useState<Subject>('Mathematics')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [topics, setTopics] = useState<string[]>([])

  const cls = getClass(classId)
  const availableTopics = DEMO_COMPETENCIES.filter((c) => c.subject === subject)

  const toggleTopic = (name: string) => setTopics((t) => (t.includes(name) ? t.filter((x) => x !== name) : [...t, name]))

  const submit = (e: FormEvent, draft = false) => {
    e.preventDefault()
    notify(draft ? 'Draft saved for preview' : 'Assessment created for preview', {
      description: 'Not saved — assessment storage will be added when the backend is connected.',
    })
    navigate('/assessments')
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
                options={SUBJECTS.map((s) => ({ value: s, label: s }))}
              />
              <TextField label="Date" type="date" defaultValue="2026-09-30" />
              <TextField label={type === 'Teacher Observation' ? 'Rating scale (max)' : 'Maximum score'} type="number" min={1} defaultValue={type === 'Teacher Observation' ? 10 : 20} />
              <TextArea label="Instructions (optional)" className="sm:col-span-2" rows={3} placeholder="Notes for learners or for recording results…" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Curriculum areas assessed"
              description={cls ? `Framework: ${FRAMEWORK_LABEL[cls.framework]} · ${cls.level}` : undefined}
            />
            <CardBody>
              <p className="mb-3 text-sm text-ink-2">Select the competency areas this assessment covers. Results will be mapped to these areas.</p>
              <div className="flex flex-wrap gap-2">
                {availableTopics.map((c) => {
                  const active = topics.includes(c.name)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTopic(c.name)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        active ? 'border-brand-500 bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2',
                      )}
                    >
                      {active && <Check className="size-3.5" aria-hidden />}
                      {c.name}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-ink-3">Demo competency list — the full curriculum mapping will come from the curriculum module.</p>
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
                <SummaryRow label="Class" value={cls?.name ?? '—'} />
                <SummaryRow label="Students" value={String(cls?.studentCount ?? 0)} />
                <SummaryRow label="Areas" value={topics.length ? topics.join(', ') : 'None selected'} />
              </dl>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-info-soft p-3 text-sm text-brand-ink">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>Once scores are entered, results update each student’s competency profile and may produce new teaching guidance for your review.</p>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <Button type="submit">Create assessment</Button>
                <Button variant="secondary" onClick={(e) => submit(e, true)}>
                  Save as draft
                </Button>
              </div>
              <DemoNotice className="mt-4">Prototype — assessments are not saved yet.</DemoNotice>
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
