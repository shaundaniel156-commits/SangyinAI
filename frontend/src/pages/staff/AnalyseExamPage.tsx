import { FileText, Plus, Sparkles, Stethoscope, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
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
import { readBase64, shrinkPhoto } from '../../lib/photo'
import { subjectChoices } from '../../lib/subjects'
import type { DiagnosticReport, GuidancePlan } from '../../types'

interface Row {
  topic: string
  score: string
  outOf: string
}

const EMPTY_ROW: Row = { topic: '', score: '', outOf: '' }

// A marked exam script, mark sheet or report card: PDFs and photos (scans and handwriting too), Word or text.
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.md,.csv'
// Uploads pass through the site's proxy, which takes about 4.5 MB per request; photos are shrunk first, so this is for other files.
const MAX_MB = 3

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
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  // What the button says while working: the diagnosis first, then the guidance plan drafted from it.
  const [stage, setStage] = useState<'diagnosis' | 'guidance'>('diagnosis')
  const [error, setError] = useState('')

  const setRow = (i: number, change: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...change } : r)))
  const filled = rows.filter((r) => r.topic.trim() || r.score || r.outOf)

  const chooseFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    const chosen = picked.type.startsWith('image/') ? await shrinkPhoto(picked).catch(() => picked) : picked
    if (chosen.size > MAX_MB * 1024 * 1024) return setError(`That file is over ${MAX_MB} MB. Try a smaller scan, fewer pages, or a photo.`)
    setError('')
    setFile(chosen)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const incomplete = filled.find((r) => !r.topic.trim() || r.score === '' || !Number(r.outOf))
    if (incomplete) return setError('Each mark row needs a topic, the marks scored and what it is out of.')
    if (!filled.length && report.trim().length < 20 && !file) return setError('Enter marks for at least one topic, paste the report, or upload a document.')
    setBusy(true)
    setStage('diagnosis')
    try {
      const created = await api<DiagnosticReport>('/diagnostics', {
        body: {
          studentId,
          subject: subject.trim(),
          examTitle: examTitle.trim(),
          items: filled.map((r) => ({ topic: r.topic.trim(), score: Number(r.score), outOf: Number(r.outOf) })),
          report: report.trim(),
          ...(file ? { document: { name: file.name, data: await readBase64(file) } } : {}),
        },
      })
      // Straight away, the AI drafts a guidance plan for the gaps it found, for the teacher to review. If that
      // fails the diagnosis still stands; the plan can be generated later from AI Guidance.
      setStage('guidance')
      const guidance = await api<{ plans: GuidancePlan[] }>('/guidance/generate', { body: { studentId, subject: subject.trim() } }).catch(() => null)
      const drafted = guidance?.plans.length ?? 0
      await refresh()
      notify('Competency gaps diagnosed', {
        description: `${created.processing === 'refined' ? 'Review the AI’s assessment.' : 'Worked out from the marks; the AI was not available.'}${drafted ? ` ${drafted} guidance plan${drafted === 1 ? ' is' : 's are'} waiting for your review under AI Guidance.` : ''}`,
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
        description="Enter a student’s marks from an exam or test, paste their report, or upload the marked script or report card. The AI finds the competency gaps and suggests next steps."
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
                <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="e.g. Mathematics" list="exam-subjects" />
                <datalist id="exam-subjects">
                  {subjectChoices(students.find((s) => s.id === studentId)?.subjects ?? []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
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
              <CardHeader title="Upload a document" description="Optional. A marked exam script, mark sheet or report card: PDF, photo, Word or text. Photos are made smaller automatically; other files up to 3 MB." />
              <CardBody>
                <input ref={fileInput} type="file" accept={ACCEPT} onChange={chooseFile} className="sr-only" tabIndex={-1} aria-hidden />
                {file ? (
                  <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                    <FileText className="size-5 shrink-0 text-brand-ink" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                      <p className="text-xs text-ink-3">{(file.size / 1024 / 1024).toFixed(1)} MB · the AI will read it</p>
                    </div>
                    <button type="button" onClick={() => setFile(null)} aria-label="Remove document" className="rounded-md p-1.5 text-ink-3 hover:bg-surface-3 hover:text-bad-ink">
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => fileInput.current?.click()} className="w-full" icon={<Upload className="size-4" aria-hidden />}>
                    Upload document
                  </Button>
                )}
                <p className="mt-2 text-xs text-ink-3">The document goes to the AI as it is, including any names written on it.</p>
              </CardBody>
            </Card>

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
              {busy ? (stage === 'guidance' ? 'Drafting teaching guidance…' : 'Analysing…') : 'Find competency gaps'}
            </Button>
          </div>
        </form>
      )}
    </>
  )
}
