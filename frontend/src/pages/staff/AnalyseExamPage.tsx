import { Plus, Sparkles, Stethoscope, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useLiveData } from '../../context/LiveDataContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { getClass } from '../../data/classes'
import { studentsInScope } from '../../data/selectors'
import { api, ApiError } from '../../lib/api'
import type { DiagnosticReport } from '../../types'

interface Row {
  topic: string
  score: string
  outOf: string
}

const EMPTY_ROW: Row = { topic: '', score: '', outOf: '' }

/**
 * Analyse exam results: the teacher enters one student's marks per topic or question and/or pastes the report,
 * and the AI diagnoses the competency gaps. The result opens as a diagnostic report.
 */
export function AnalyseExamPage() {
  const { role } = useSession()
  const { refresh } = useLiveData()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const students = studentsInScope(role)
  const [studentId, setStudentId] = useState(params.get('student') ?? '')
  const [subject, setSubject] = useState('Mathematics')
  const [examTitle, setExamTitle] = useState('')
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }])
  const [report, setReport] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setRow = (i: number, change: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...change } : r)))
  const filled = rows.filter((r) => r.topic.trim() || r.score || r.outOf)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const incomplete = filled.find((r) => !r.topic.trim() || r.score === '' || !Number(r.outOf))
    if (incomplete) return setError('Each mark row needs a topic, the marks scored and what it is out of.')
    if (!filled.length && report.trim().length < 20) return setError('Enter marks for at least one topic, or paste the report.')
    setBusy(true)
    try {
      const created = await api<DiagnosticReport>('/diagnostics', {
        body: {
          studentId,
          subject: subject.trim(),
          examTitle: examTitle.trim(),
          items: filled.map((r) => ({ topic: r.topic.trim(), score: Number(r.score), outOf: Number(r.outOf) })),
          report: report.trim(),
        },
      })
      await refresh()
      notify('Competency gaps diagnosed', {
        description: created.processing === 'refined' ? 'Review the AI’s assessment.' : 'Worked out from the marks; the AI was not available.',
      })
      navigate(`/diagnostics/${created.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        back={{ to: '/diagnostics', label: 'Diagnostics' }}
        title="Analyse exam results"
        description="Enter a student’s marks from an exam or test, or paste their report. The AI finds the competency gaps and suggests next steps."
      />

      {students.length === 0 ? (
        <Card>
          <EmptyState icon={Stethoscope} title="No students yet" description="Add students to your classes first (Learners → Add students & parents)." />
        </Card>
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="space-y-6 xl:col-span-3">
            <Card>
              <CardHeader title="The exam" />
              <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  className="sm:col-span-2"
                  options={[
                    { value: '', label: 'Choose a student' },
                    ...students.map((s) => ({ value: s.id, label: `${s.name} · ${getClass(s.classId)?.name ?? ''}` })),
                  ]}
                />
                <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="e.g. Mathematics" />
                <TextField label="Exam or test" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} required placeholder="e.g. End of term 2 exam" />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Marks by topic or question" description="One row per topic or question. The more detail, the sharper the diagnosis." />
              <CardBody className="space-y-3">
                <div className="hidden grid-cols-[1fr_6rem_6rem_2.5rem] gap-2 text-xs font-medium uppercase tracking-wide text-ink-3 sm:grid">
                  <span>Topic or question</span>
                  <span>Scored</span>
                  <span>Out of</span>
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_5rem_5rem_2.5rem] items-end gap-2 sm:grid-cols-[1fr_6rem_6rem_2.5rem]">
                    <TextField label={`Topic ${i + 1}`} hideLabel value={r.topic} onChange={(e) => setRow(i, { topic: e.target.value })} placeholder="e.g. Fractions: Q1–4" />
                    <TextField label={`Scored, topic ${i + 1}`} hideLabel type="number" min={0} step="any" inputMode="decimal" value={r.score} onChange={(e) => setRow(i, { score: e.target.value })} placeholder="6" />
                    <TextField label={`Out of, topic ${i + 1}`} hideLabel type="number" min={0} step="any" inputMode="decimal" value={r.outOf} onChange={(e) => setRow(i, { outOf: e.target.value })} placeholder="10" />
                    <button
                      type="button"
                      onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ ...EMPTY_ROW }]))}
                      aria-label={`Remove topic ${i + 1}`}
                      className="flex h-10 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-3 hover:text-bad-ink"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW }])} icon={<Plus className="size-4" aria-hidden />} disabled={rows.length >= 60}>
                  Add row
                </Button>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader title="Report or comments" description="Optional. Paste the report card comments, or describe the mistakes you saw." />
              <CardBody>
                <TextArea
                  label="Report"
                  rows={8}
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  maxLength={5000}
                  placeholder="e.g. Good at mental arithmetic but mixes up numerator and denominator; left the word problems blank."
                  hint="The student’s name is not sent to the AI."
                />
              </CardBody>
            </Card>

            {error && (
              <p className="rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad-ink" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !studentId} className="w-full" icon={<Sparkles className="size-4" aria-hidden />}>
              {busy ? 'Analysing…' : 'Find competency gaps'}
            </Button>
          </div>
        </form>
      )}
    </>
  )
}
