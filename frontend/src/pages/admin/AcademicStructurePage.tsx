import { Layers, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SegmentedControl } from '../../components/ui/Tabs'
import { useLiveData } from '../../context/LiveDataContext'
import { useToast } from '../../context/ToastContext'
import { CLASSES } from '../../data/classes'
import { CURRICULUM_FRAMEWORKS, FRAMEWORK_LABEL } from '../../data/curriculum'
import { SCHOOL } from '../../data/school'
import { STUDENTS } from '../../data/students'
import { getTeacher } from '../../data/teachers'
import { api } from '../../lib/api'
import type { CurriculumFramework } from '../../types'
import { SchoolInfoCard } from './components/SchoolInfoCard'

export function AcademicStructurePage() {
  const { notify } = useToast()
  // In the lists below: they are worked out again each time the data is reloaded.
  const { live, version, refresh } = useLiveData()
  const [schoolFramework, setSchoolFramework] = useState<CurriculumFramework>(SCHOOL.primaryFramework)
  const [saving, setSaving] = useState(false)
  // National or Cambridge for the school; a school's own curriculum is given to classes in the Manual feed.
  const schoolOptions = CURRICULUM_FRAMEWORKS.filter((f) => f.id === 'uganda' || f.id === 'cambridge')

  const levels = useMemo(() => {
    const map = new Map<string, typeof CLASSES>()
    for (const c of CLASSES) map.set(c.level, [...(map.get(c.level) ?? []), c])
    return [...map.entries()]
    // `version` is here on purpose: the data lists are refilled in place on a reload, so nothing else changes.
  }, [version])

  const dirty = schoolFramework !== SCHOOL.primaryFramework

  // The school's curriculum is saved with its details (the same as Manual feed's institution details).
  const save = async () => {
    if (!live) return notify('Offline', { tone: 'info', description: 'Sign in while connected to change the curriculum.' })
    setSaving(true)
    try {
      await api('/feed/institution', { method: 'PATCH', body: { framework: schoolFramework } })
      await refresh()
      notify('School curriculum saved', { description: 'The class names offered now follow it.' })
    } catch (error) {
      notify('Not saved', { tone: 'info', description: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Academic Structure"
        description="School details, levels and classes, and the curriculum framework each class follows."
        actions={
          <Button onClick={save} disabled={!dirty || saving} icon={<Save className="size-4" aria-hidden />}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <SchoolInfoCard classCount={CLASSES.length} studentCount={STUDENTS.length} />

      <Card className="mt-6">
        <CardHeader
          title="School curriculum framework"
          description="The default framework for the school. With the type of school, it decides the class names offered. Individual classes can follow a different framework below."
        />
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <SegmentedControl
            label="School primary framework"
            value={schoolFramework}
            onChange={setSchoolFramework}
            options={schoolOptions.map((f) => ({ id: f.id, label: f.name }))}
            className="max-w-full flex-wrap"
          />
          <p className="max-w-md text-sm text-ink-3">
            {CURRICULUM_FRAMEWORKS.find((f) => f.id === schoolFramework)?.description}
          </p>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          icon={<Layers className="size-5" aria-hidden />}
          title="Levels and classes"
          description="The curriculum framework each class follows. Diagnostics and guidance map to it."
        />
        <div className="divide-y divide-line">
          {levels.map(([level, classes]) => (
            <section key={level} aria-label={level} className="px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-3">{level}</h3>
              <ul className="mt-3 space-y-3">
                {classes.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-3 rounded-lg border border-line bg-surface-2 p-3.5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/classes/${c.id}`} className="font-medium text-ink hover:underline">
                          {c.name}
                        </Link>
                        {c.framework !== SCHOOL.primaryFramework && <StatusBadge tone="accent">Differs from school default</StatusBadge>}
                      </div>
                      <p className="mt-0.5 text-sm text-ink-3">
                        {getTeacher(c.teacherId)?.name} · {c.studentCount} students · {c.subjects.join(', ')}
                      </p>
                    </div>
                    <StatusBadge tone={c.framework === 'cambridge' ? 'accent' : 'neutral'}>{FRAMEWORK_LABEL[c.framework]}</StatusBadge>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!levels.length && <p className="px-5 py-6 text-sm text-ink-3">No classes yet. Add them in Manual feed (Staff and classes).</p>}
        </div>
        <p className="border-t border-line px-5 py-4 text-sm text-ink-3">
          To change a class’s curriculum, add or update the class in{' '}
          <Link to="/data?tab=people" className="font-medium text-brand-ink hover:underline">
            Manual feed
          </Link>{' '}
          (Staff and classes, the Curriculum column).
        </p>
      </Card>
    </>
  )
}
