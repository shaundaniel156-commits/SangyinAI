import { ArrowRight, Camera, Check, Download, FileSpreadsheet, Mic, Server, UploadCloud, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { SelectField } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { assessmentsInScope } from '../../data/selectors'
import { cn } from '../../lib/cn'

const STEPS = ['Upload file', 'Match columns', 'Review & confirm']

/** Example column mapping shown for preview only — no file is read. */
const EXAMPLE_MAPPING = [
  { column: 'Learner Name', field: 'Student name' },
  { column: 'Class', field: 'Class' },
  { column: 'Marks', field: 'Score' },
  { column: 'Comment', field: 'Remark (optional)' },
]

/** Alternative data sources from the project spec (SIS connector, paper-report capture). UI only. */
const OTHER_SOURCES = [
  {
    id: 'sis',
    icon: Server,
    label: 'School Information System',
    description: 'Sync class lists and scores from your school’s existing information system.',
    action: 'Connect SIS',
    later: 'SIS connectors will be added with the backend.',
  },
  {
    id: 'photo',
    icon: Camera,
    label: 'Photo of a paper report',
    description: 'Take a photo of a paper mark sheet or report card to capture the scores.',
    action: 'Take photo',
    later: 'Photo capture will be added with the backend. Scores will be shown for you to check before saving.',
  },
  {
    id: 'voice',
    icon: Mic,
    label: 'Voice note',
    description: 'Read out scores or observations and have them turned into records.',
    action: 'Record voice note',
    later: 'Voice capture will be added with the backend. You will review every record before saving.',
  },
]

export function ImportResultsPage() {
  const { role } = useSession()
  const { notify } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const assessments = assessmentsInScope(role).filter((a) => a.status !== 'completed')

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  return (
    <>
      <PageHeader
        back={{ to: '/assessments', label: 'Assessments' }}
        title="Import results"
        description="Bring in scores from an Excel or CSV report card, your School Information System or a paper report instead of typing them one by one."
        actions={
          <Button
            variant="secondary"
            icon={<Download className="size-4" aria-hidden />}
            onClick={() => notify('Template download not available yet', { tone: 'info', description: 'The import template will be provided with the backend.' })}
          >
            Download template
          </Button>
        }
      />

      <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Import steps">
        {STEPS.map((s, i) => {
          const done = i === 0 && file !== null
          const current = (i === 0 && !file) || (i === 1 && file !== null)
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full text-xs font-semibold',
                  done ? 'bg-good text-white' : current ? 'bg-brand-600 text-white' : 'bg-surface-3 text-ink-3',
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn(current ? 'font-medium text-ink' : 'text-ink-3')} aria-current={current ? 'step' : undefined}>
                {s}
              </span>
              {i < STEPS.length - 1 && <ArrowRight className="mx-1 size-4 text-ink-3" aria-hidden />}
            </li>
          )
        })}
      </ol>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="1. Choose where the results belong" />
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Assessment"
                options={[
                  ...assessments.map((a) => ({ value: a.id, label: a.title })),
                  { value: 'new', label: 'Create a new assessment from the file' },
                ]}
              />
              <SelectField
                label="File type"
                options={[
                  { value: 'xlsx', label: 'Excel (.xlsx, .xls)' },
                  { value: 'csv', label: 'CSV (.csv)' },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="2. Upload file" />
            <CardBody>
              {file ? (
                <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-4">
                  <FileSpreadsheet className="size-8 shrink-0 text-good" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                    <p className="text-xs text-ink-3">{(file.size / 1024).toFixed(1)} KB · selected — not processed in this prototype</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="rounded-md p-1 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label="Remove file">
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                    dragging ? 'border-brand-500 bg-brand-soft' : 'border-line-strong bg-surface-2',
                  )}
                >
                  <UploadCloud className="size-10 text-ink-3" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-ink">Drag and drop your file here</p>
                  <p className="mt-1 text-sm text-ink-3">Excel or CSV · one row per student</p>
                  <Button variant="secondary" className="mt-4" onClick={() => inputRef.current?.click()}>
                    Browse files
                  </Button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Choose results file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}
            </CardBody>
          </Card>

          <Card className={cn(!file && 'opacity-60')}>
            <CardHeader title="3. Match columns" description="Example of how spreadsheet columns will be matched to Sangyin AI fields." />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <th scope="col" className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-3">Column in your file</th>
                    <th scope="col" className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-ink-3">Maps to</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {EXAMPLE_MAPPING.map((m) => (
                    <tr key={m.column}>
                      <td className="px-5 py-3 font-mono text-[13px] text-ink-2">{m.column}</td>
                      <td className="px-5 py-3 text-ink">{m.field}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Other ways to add results" description="For schools that keep results in another system or on paper" />
            <ul className="divide-y divide-line">
              {OTHER_SOURCES.map((s) => (
                <li key={s.id} className="flex items-start gap-3 px-6 py-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                    <s.icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{s.label}</p>
                    <p className="mt-0.5 text-sm text-ink-3">{s.description}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => notify(`${s.label} is not connected in this prototype`, { tone: 'info', description: s.later })}
                    >
                      {s.action}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Before you import" />
            <CardBody>
              <ul className="space-y-3 text-sm text-ink-2">
                {[
                  'Use one row per student and one column for scores.',
                  'Student names or IDs should match the class list.',
                  'Scores must not be higher than the assessment’s maximum score.',
                  'Rows that cannot be matched will be listed for you to review before anything is saved.',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                disabled={!file}
                onClick={() => notify('Import preview only', { tone: 'info', description: 'File processing will be added when the backend is connected.' })}
              >
                Continue to review
              </Button>
            </CardBody>
          </Card>
          <DemoNotice>
            <p className="font-medium text-ink">Import is a visual preview</p>
            <p className="mt-0.5">No file is read, uploaded or processed yet. Excel/CSV import will be implemented with the backend.</p>
          </DemoNotice>
        </div>
      </div>
    </>
  )
}
