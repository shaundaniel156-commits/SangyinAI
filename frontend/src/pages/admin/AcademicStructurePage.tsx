import { Layers, RotateCcw, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { SelectField } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SegmentedControl } from '../../components/ui/Tabs'
import { useToast } from '../../context/ToastContext'
import { CLASSES } from '../../data/classes'
import { CURRICULUM_FRAMEWORKS, FRAMEWORK_LABEL } from '../../data/curriculum'
import { DEMO_SCHOOL } from '../../data/school'
import { STUDENTS } from '../../data/students'
import { getTeacher } from '../../data/teachers'
import type { CurriculumFramework } from '../../types'
import { SchoolInfoCard } from './components/SchoolInfoCard'

const FRAMEWORK_OPTIONS = CURRICULUM_FRAMEWORKS.map((f) => ({ value: f.id, label: f.name }))
const INITIAL_CLASS_FRAMEWORKS = Object.fromEntries(CLASSES.map((c) => [c.id, c.framework])) as Record<string, CurriculumFramework>

export function AcademicStructurePage() {
  const { notify } = useToast()
  const [schoolFramework, setSchoolFramework] = useState<CurriculumFramework>(DEMO_SCHOOL.primaryFramework)
  const [classFrameworks, setClassFrameworks] = useState(INITIAL_CLASS_FRAMEWORKS)

  const levels = useMemo(() => {
    const map = new Map<string, typeof CLASSES>()
    for (const c of CLASSES) map.set(c.level, [...(map.get(c.level) ?? []), c])
    return [...map.entries()]
  }, [])

  const dirty =
    schoolFramework !== DEMO_SCHOOL.primaryFramework || CLASSES.some((c) => classFrameworks[c.id] !== c.framework)

  const save = () => notify('Curriculum configuration saved', { description: 'Saved locally for preview — not persisted in this prototype.' })
  const reset = () => {
    setSchoolFramework(DEMO_SCHOOL.primaryFramework)
    setClassFrameworks(INITIAL_CLASS_FRAMEWORKS)
  }

  return (
    <>
      <PageHeader
        title="Academic Structure"
        description="School details, levels and classes, and the curriculum framework each class follows."
        actions={
          <>
            <Button variant="secondary" onClick={reset} disabled={!dirty} icon={<RotateCcw className="size-4" aria-hidden />}>
              Reset
            </Button>
            <Button onClick={save} icon={<Save className="size-4" aria-hidden />}>
              Save changes
            </Button>
          </>
        }
      />

      <SchoolInfoCard classCount={CLASSES.length} studentCount={STUDENTS.length} />

      <Card className="mt-6">
        <CardHeader
          title="School curriculum framework"
          description="The default framework for the school. Individual classes can follow a different framework below."
        />
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <SegmentedControl
            label="School primary framework"
            value={schoolFramework}
            onChange={setSchoolFramework}
            options={CURRICULUM_FRAMEWORKS.map((f) => ({ id: f.id, label: f.name }))}
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
          description="Set the curriculum framework per class. Diagnostics and guidance map to the selected framework."
        />
        <div className="divide-y divide-line">
          {levels.map(([level, classes]) => (
            <section key={level} aria-label={level} className="px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-3">{level}</h3>
              <ul className="mt-3 space-y-3">
                {classes.map((c) => {
                  const value = classFrameworks[c.id]!
                  const differs = value !== schoolFramework
                  return (
                    <li
                      key={c.id}
                      className="flex flex-col gap-3 rounded-lg border border-line bg-surface-2 p-3.5 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/classes/${c.id}`} className="font-medium text-ink hover:underline">
                            {c.name}
                          </Link>
                          {differs && <StatusBadge tone="accent">Differs from school default</StatusBadge>}
                          {value !== c.framework && <StatusBadge tone="warn">Unsaved</StatusBadge>}
                        </div>
                        <p className="mt-0.5 text-sm text-ink-3">
                          {getTeacher(c.teacherId)?.name} · {c.studentCount} students · {c.subjects.join(', ')}
                        </p>
                      </div>
                      <SelectField
                        label={`Curriculum framework for ${c.name}`}
                        hideLabel
                        className="w-full md:w-64"
                        value={value}
                        onChange={(e) => setClassFrameworks((prev) => ({ ...prev, [c.id]: e.target.value as CurriculumFramework }))}
                        options={FRAMEWORK_OPTIONS}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </Card>

      <DemoNotice className="mt-6">
        Changes are kept in this page only and are not persisted. Framework names shown: {FRAMEWORK_LABEL.uganda} and {FRAMEWORK_LABEL.cambridge}.
      </DemoNotice>
    </>
  )
}
