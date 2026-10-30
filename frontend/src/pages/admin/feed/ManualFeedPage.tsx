import { BookOpen, FileText, Library, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { DemoNotice } from '../../../components/ui/DemoNotice'
import { SelectField, TextArea, TextField } from '../../../components/ui/Field'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Tabs } from '../../../components/ui/Tabs'
import { useLiveData } from '../../../context/LiveDataContext'
import { useSession } from '../../../context/SessionContext'
import { useToast } from '../../../context/ToastContext'
import { CLASSES } from '../../../data/classes'
import { api } from '../../../lib/api'
import { BulkUpload } from './BulkUpload'
import { RowForm } from './RowForm'
import type { FeedKindInfo, FeedKindKey } from './feedApi'

type TabId = 'curriculum' | 'references' | 'questions' | 'people'

/**
 * The Manual feed: everything an institution adds by hand or by spreadsheet — curriculum and courses,
 * reference material for the AI, the question bank, and people and classes. Works for primary and
 * secondary schools and for universities (programmes → years → course units).
 */
export function ManualFeedPage() {
  const { role } = useSession()
  const { live, refresh } = useLiveData()
  const [params, setParams] = useSearchParams()
  const [kinds, setKinds] = useState<Partial<Record<FeedKindKey, FeedKindInfo>>>({})
  const isAdmin = role === 'admin'
  const tabs: { id: TabId; label: string }[] = [
    ...(isAdmin ? [{ id: 'curriculum' as const, label: 'Curriculum and courses' }] : []),
    { id: 'references', label: 'Reference material' },
    { id: 'questions', label: 'Question bank' },
    // Admins add staff and classes; teachers add the students (and their parents) in their own classes.
    { id: 'people' as const, label: isAdmin ? 'Staff and classes' : 'Students and parents' },
  ]
  const tab = (tabs.find((t) => t.id === params.get('tab'))?.id ?? tabs[0]!.id) as TabId

  // Other pages show this data too; reload it once when leaving the page if anything changed.
  const changed = useRef(false)
  const markChanged = useCallback(() => { changed.current = true }, [])
  useEffect(() => () => { if (changed.current) void refresh() }, [refresh])

  useEffect(() => {
    if (!live) return
    api<FeedKindInfo[]>('/feed/kinds').then((list) => setKinds(Object.fromEntries(list.map((k) => [k.key, k])))).catch(() => setKinds({}))
  }, [live])

  return (
    <>
      <PageHeader
        title="Manual feed"
        description="Add your institution's own data by hand or from a spreadsheet: curriculum and courses, reference material for the AI, reviewed questions, and people and classes. For primary, secondary and university."
      />
      {!live ? (
        <DemoNotice>Offline — sign in while connected to the server to add data.</DemoNotice>
      ) : (
        <>
          <Tabs tabs={tabs} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} label="Manual feed sections" className="mb-6" />
          {tab === 'curriculum' && kinds.curriculum && <CurriculumTab kind={kinds.curriculum} onChanged={markChanged} />}
          {tab === 'references' && <ReferencesTab onChanged={markChanged} />}
          {tab === 'questions' && kinds.questions && <QuestionsTab kind={kinds.questions} onChanged={markChanged} canDeleteAll={isAdmin} />}
          {tab === 'people' && (isAdmin ? <PeopleTab kinds={kinds} onChanged={markChanged} /> : <StudentsTab kinds={kinds} onChanged={markChanged} />)}
        </>
      )}
    </>
  )
}

/** A form and a spreadsheet upload for one kind of data, side by side. */
function AddPanels({ kind, onSaved, formTitle }: { kind: FeedKindInfo; onSaved: () => void; formTitle: string }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title={formTitle} description={kind.description} />
        <CardBody>
          <RowForm kind={kind} onSaved={onSaved} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Add many from a spreadsheet" description="CSV or Excel (.xlsx), one row per item." />
        <CardBody>
          <BulkUpload kind={kind} onSaved={onSaved} />
        </CardBody>
      </Card>
    </div>
  )
}

// --- Curriculum and courses ------------------------------------------------------------

interface OwnLevel {
  id: string
  name: string
  programme: { id: string; code: string; name: string; award: string | null; years: number } | null
  classes: number
  subjects: { id: string; name: string; code: string | null; term: string | null; creditUnits: number | null; topics: number }[]
}

function CurriculumTab({ kind, onChanged }: { kind: FeedKindInfo; onChanged: () => void }) {
  const { notify } = useToast()
  const [levels, setLevels] = useState<OwnLevel[] | null>(null)
  const load = useCallback(() => { api<OwnLevel[]>('/feed/curriculum').then(setLevels).catch(() => setLevels([])) }, [])
  useEffect(load, [load])
  const saved = () => { onChanged(); load() }

  const remove = async (what: 'levels' | 'subjects', id: string, label: string) => {
    if (!window.confirm(`Delete ${label} and everything under it (topics, outcomes and objectives)?`)) return
    try {
      await api(`/feed/curriculum/${what}/${id}`, { method: 'DELETE' })
      notify(`${label} deleted`, { tone: 'info' })
      saved()
    } catch (error) {
      notify('Not deleted', { tone: 'info', description: (error as Error).message })
    }
  }

  return (
    <div className="space-y-6">
      <AddPanels kind={kind} onSaved={saved} formTitle="Add a topic or learning outcome" />
      <Card>
        <CardHeader
          icon={<Library className="size-5" aria-hidden />}
          title="Your institution's curriculum"
          description="Programmes, years or levels and their subjects or course units. Open the Curriculum page to see topics and outcomes."
        />
        <CardBody>
          {levels === null ? (
            <p className="text-sm text-ink-3">Loading…</p>
          ) : levels.length === 0 ? (
            <p className="text-sm text-ink-3">Nothing added yet. Add a row above, or upload the template.</p>
          ) : (
            <ul className="space-y-4">
              {levels.map((l) => (
                <li key={l.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">{l.name}</p>
                      <p className="text-sm text-ink-3">
                        {l.programme ? `${l.programme.name}${l.programme.award ? ` · ${l.programme.award}` : ''} · ${l.programme.years} years` : 'Own curriculum level'} · {l.classes} class{l.classes === 1 ? '' : 'es'} linked
                      </p>
                    </div>
                    <button type="button" onClick={() => void remove('levels', l.id, l.name)} className="rounded p-1 text-ink-3 hover:bg-surface-3 hover:text-bad-ink" aria-label={`Delete ${l.name}`}>
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <ul className="mt-3 divide-y divide-line rounded-md bg-surface-2">
                    {l.subjects.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="text-ink">
                          {s.code && <code className="mr-2 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs">{s.code}</code>}
                          {s.name}
                        </span>
                        <span className="flex items-center gap-3 text-xs text-ink-3">
                          {[s.term, s.creditUnits !== null ? `${s.creditUnits} CU` : null, `${s.topics} topic${s.topics === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                          <button type="button" onClick={() => void remove('subjects', s.id, s.name)} className="rounded p-1 hover:bg-surface-3 hover:text-bad-ink" aria-label={`Delete ${s.name}`}>
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <Link to="/curriculum" className="mt-4 inline-block text-sm font-medium text-brand-ink hover:underline">
            Open the Curriculum page →
          </Link>
        </CardBody>
      </Card>
    </div>
  )
}

// --- Reference material ------------------------------------------------------------------

interface ReferenceDoc {
  id: string
  title: string
  kind: string
  subject: string | null
  level: string | null
  filename: string | null
  passages: number
  createdByName: string | null
  createdAt: string
}

const REFERENCE_KINDS = [
  { value: 'notes', label: 'Notes' },
  { value: 'scheme_of_work', label: 'Scheme of work' },
  { value: 'lesson_plan', label: 'Lesson plan' },
  { value: 'course_outline', label: 'Course outline' },
  { value: 'past_paper', label: 'Past paper (your own)' },
  { value: 'other', label: 'Other' },
]

function ReferencesTab({ onChanged }: { onChanged: () => void }) {
  const { notify } = useToast()
  const [docs, setDocs] = useState<ReferenceDoc[] | null>(null)
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title: '', kind: 'notes', subject: '', level: '', text: '' })
  const [rights, setRights] = useState(false)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { api<ReferenceDoc[]>('/feed/references').then(setDocs).catch(() => setDocs([])) }, [])
  useEffect(load, [load])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!rights) return notify('Please confirm the rights first', { tone: 'info' })
    setBusy(true)
    try {
      let added: { title: string; passages: number }
      if (mode === 'file') {
        if (!file) return notify('Choose a file first', { tone: 'info' })
        const data = new FormData()
        for (const [k, v] of Object.entries(form)) if (k !== 'text' && v) data.append(k, v)
        data.append('rightsConfirmed', 'true')
        data.append('file', file, file.name)
        added = await api('/feed/references', { form: data })
      } else {
        added = await api('/feed/references', { body: { title: form.title, kind: form.kind, subject: form.subject || undefined, level: form.level || undefined, text: form.text, rightsConfirmed: true } })
      }
      notify('Reference material added', { description: `“${added.title}” — ${added.passages} passage${added.passages === 1 ? '' : 's'} the AI can draw on.` })
      setFile(null)
      setForm({ title: '', kind: form.kind, subject: form.subject, level: form.level, text: '' })
      setRights(false)
      onChanged()
      load()
    } catch (error) {
      notify('Not added', { tone: 'info', description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (d: ReferenceDoc) => {
    if (!window.confirm(`Delete “${d.title}”?`)) return
    try {
      await api(`/feed/references/${d.id}`, { method: 'DELETE' })
      load()
    } catch (error) {
      notify('Not deleted', { tone: 'info', description: (error as Error).message })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader
          icon={<FileText className="size-5" aria-hidden />}
          title="Add reference material"
          description="Your own notes, schemes of work, lesson plans or course outlines. When drafting assessments and guidance, the AI reads the passages that match the subject and topic."
        />
        <CardBody>
          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-2 text-sm">
              {(['file', 'text'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 ${mode === m ? 'bg-brand-soft font-medium text-brand-ink' : 'text-ink-2 hover:bg-surface-2'}`}>
                  {m === 'file' ? 'Upload a file' : 'Paste text'}
                </button>
              ))}
            </div>
            {mode === 'file' ? (
              <TextField label="File (PDF, Word .docx, .txt or .md, up to 10 MB)" type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            ) : (
              <TextArea label="Text" rows={6} value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Paste notes or an outline…" />
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label={mode === 'file' ? 'Title (optional)' : 'Title'} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required={mode === 'text'} />
              <SelectField label="Type" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} options={REFERENCE_KINDS} />
              <TextField label="Subject or course unit" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics or CSC1101" hint="Helps the AI pick the right material." />
              <TextField label="Level or year" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} placeholder="e.g. Primary 6 or Year 1" />
            </div>
            <label className="flex items-start gap-2 text-sm text-ink-2">
              <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 size-4 accent-brand-600" />
              My institution wrote this material or has the right to use it. (Do not upload copyrighted syllabuses or textbooks without permission.)
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? 'Adding…' : 'Add material'}
            </Button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Your reference material" description="Only your institution sees it." />
        <CardBody>
          {docs === null ? (
            <p className="text-sm text-ink-3">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-ink-3">No material yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {docs.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{d.title}</p>
                    <p className="text-xs text-ink-3">
                      {REFERENCE_KINDS.find((k) => k.value === d.kind)?.label} · {[d.subject, d.level].filter(Boolean).join(' · ') || 'Any subject'} · {d.passages} passage{d.passages === 1 ? '' : 's'}
                      {d.createdByName ? ` · added by ${d.createdByName}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => void remove(d)} className="rounded p-1 text-ink-3 hover:bg-surface-3 hover:text-bad-ink" aria-label={`Delete ${d.title}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// --- Question bank ---------------------------------------------------------------------

interface BankItem {
  id: string
  subject: string
  level: string | null
  competency: string
  type: 'multiple_choice' | 'short_answer'
  difficulty: string
  prompt: string
  options: string[]
  answer: string
  explanation: string
  createdById: string | null
  createdByName: string | null
}

function QuestionsTab({ kind, onChanged, canDeleteAll }: { kind: FeedKindInfo; onChanged: () => void; canDeleteAll: boolean }) {
  const { notify } = useToast()
  const { user } = useSession()
  const [items, setItems] = useState<BankItem[] | null>(null)
  const [filter, setFilter] = useState('')
  const load = useCallback(() => { api<BankItem[]>('/feed/questions').then(setItems).catch(() => setItems([])) }, [])
  useEffect(load, [load])
  const saved = () => { onChanged(); load() }

  const remove = async (q: BankItem) => {
    if (!window.confirm('Delete this question?')) return
    try {
      await api(`/feed/questions/${q.id}`, { method: 'DELETE' })
      saved()
    } catch (error) {
      notify('Not deleted', { tone: 'info', description: (error as Error).message })
    }
  }

  const shown = (items ?? []).filter((q) => !filter || [q.subject, q.competency, q.level ?? '', q.prompt].join(' ').toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="space-y-6">
      <AddPanels kind={kind} onSaved={saved} formTitle="Add a question" />
      <Card>
        <CardHeader icon={<BookOpen className="size-5" aria-hidden />} title={`Your question bank${items ? ` (${items.length})` : ''}`} description="Used offline, for “Regenerate”, and as style examples for the AI." />
        <CardBody className="space-y-3">
          <TextField label="Search" hideLabel placeholder="Search by subject, topic or text…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          {items === null ? (
            <p className="text-sm text-ink-3">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="text-sm text-ink-3">{items.length ? 'No questions match.' : 'No questions yet.'}</p>
          ) : (
            <ul className="divide-y divide-line">
              {shown.slice(0, 200).map((q) => (
                <li key={q.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                      <StatusBadge>{q.subject}</StatusBadge>
                      <span>{q.competency}</span>
                      {q.level && <span>· {q.level}</span>}
                      <span>· {q.difficulty}</span>
                    </p>
                    <p className="text-sm text-ink">{q.prompt}</p>
                    {q.options.length > 0 && <p className="text-xs text-ink-3">{q.options.join(' · ')}</p>}
                    <p className="text-xs text-good-ink">Answer: {q.answer}</p>
                  </div>
                  {(canDeleteAll || q.createdById === user.id) && (
                    <button type="button" onClick={() => void remove(q)} className="shrink-0 rounded p-1 text-ink-3 hover:bg-surface-3 hover:text-bad-ink" aria-label="Delete question">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// --- People and classes -------------------------------------------------------------------

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  status: string
  subjects: string[]
  classes: string[]
}

const INSTITUTION_TYPES = [
  { value: 'primary', label: 'Primary school' },
  { value: 'secondary', label: 'Secondary school' },
  { value: 'mixed', label: 'Primary and secondary' },
  { value: 'university', label: 'University or college' },
]

/** A teacher's students, with each student's and parent's account: only into classes the teacher teaches. */
function StudentsTab({ kinds, onChanged }: { kinds: Partial<Record<FeedKindKey, FeedKindInfo>>; onChanged: () => void }) {
  const kind = kinds.students
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">
        {CLASSES.length
          ? <>Your classes: <strong className="text-ink">{CLASSES.map((c) => c.name).join(', ')}</strong>. Give a student email to create the student’s sign-in, and a parent email to create the parent’s; each gets a one-time password.</>
          : 'You aren’t assigned to any class yet. Ask your administrator to add you to a class, then add its students here.'}
      </p>
      {kind && CLASSES.length > 0 && <AddPanels kind={kind} onSaved={onChanged} formTitle="Add a student" />}
    </div>
  )
}

function PeopleTab({ kinds, onChanged }: { kinds: Partial<Record<FeedKindKey, FeedKindInfo>>; onChanged: () => void }) {
  const { notify } = useToast()
  const [section, setSection] = useState<'staff' | 'classes'>('staff')
  const [institution, setInstitution] = useState<{ name: string; district: string | null; type: string } | null>(null)
  const [staff, setStaff] = useState<StaffMember[] | null>(null)
  const loadStaff = useCallback(() => { api<StaffMember[]>('/feed/staff').then(setStaff).catch(() => setStaff([])) }, [])
  useEffect(() => { api<{ name: string; district: string | null; type: string }>('/feed/institution').then(setInstitution).catch(() => setInstitution(null)) }, [])
  useEffect(loadStaff, [loadStaff])

  const saveInstitution = async (e: FormEvent) => {
    e.preventDefault()
    if (!institution) return
    try {
      setInstitution(await api('/feed/institution', { method: 'PATCH', body: { name: institution.name, type: institution.type, district: institution.district ?? undefined } }))
      notify('Institution details saved')
      onChanged()
    } catch (error) {
      notify('Not saved', { tone: 'info', description: (error as Error).message })
    }
  }

  const kind = kinds[section]
  const saved = () => { onChanged(); if (section === 'staff') loadStaff() }
  return (
    <div className="space-y-6">
      {institution && (
        <Card>
          <CardHeader title="Your institution" description="The type decides how Sangyin talks about levels: classes and subjects, or programmes, years and course units." />
          <CardBody>
            <form onSubmit={saveInstitution} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
              <TextField label="Name" value={institution.name} onChange={(e) => setInstitution({ ...institution, name: e.target.value })} className="sm:col-span-2" />
              <SelectField label="Type" value={institution.type} onChange={(e) => setInstitution({ ...institution, type: e.target.value })} options={INSTITUTION_TYPES} />
              <Button type="submit">Save</Button>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 text-sm" role="group" aria-label="What to add">
        {(['staff', 'classes'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSection(s)} className={`rounded-md px-3 py-1.5 ${section === s ? 'bg-brand-soft font-medium text-brand-ink' : 'text-ink-2 hover:bg-surface-2'}`}>
            {s === 'staff' ? '1. Staff (teachers, lecturers)' : '2. Classes and cohorts'}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-3">Add staff first (so classes can name their teacher), then classes. Teachers then add the students and parents in their own classes.</p>
      {kind && <AddPanels key={section} kind={kind} onSaved={saved} formTitle={section === 'staff' ? 'Add a staff member' : 'Add a class or cohort'} />}

      {section === 'staff' && (
        <Card>
          <CardHeader icon={<Users className="size-5" aria-hidden />} title="Staff accounts" />
          <CardBody>
            {staff === null ? (
              <p className="text-sm text-ink-3">Loading…</p>
            ) : (
              <ul className="divide-y divide-line">
                {staff.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span>
                      <span className="font-medium text-ink">{s.name}</span> <span className="text-ink-3">· {s.email}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                      <StatusBadge tone={s.role === 'admin' ? 'accent' : 'neutral'}>{s.role === 'admin' ? 'Admin' : 'Teacher / lecturer'}</StatusBadge>
                      {s.classes.length > 0 && <span>{s.classes.join(', ')}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
