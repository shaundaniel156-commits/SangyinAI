import { Building2, FolderOpen, Library, School, Star } from 'lucide-react'
import { useState } from 'react'
import { FrameworkBadge } from '../../components/domain/FrameworkBadge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { SelectField } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { CURRICULUM_DISCLAIMER, CURRICULUM_FRAMEWORKS, FRAMEWORK_LABEL, getFramework } from '../../data/curriculum'
import { DEMO_SCHOOL } from '../../data/school'
import { classesInScope, studentsInScope } from '../../data/selectors'
import type { CurriculumFramework } from '../../types'
import { CurriculumTree } from './curriculum/CurriculumTree'
import { FrameworkPicker } from './curriculum/FrameworkPicker'
import { HierarchyPath } from './curriculum/HierarchyPath'
import { PrerequisitesPanel, TopicSupportPanel } from './curriculum/TopicSupportPanel'

export function CurriculumPage() {
  const { role } = useSession()
  const { notify } = useToast()
  const isAdmin = role === 'admin'

  // Local preview state only — nothing is persisted.
  const [primary, setPrimary] = useState<CurriculumFramework>(DEMO_SCHOOL.primaryFramework)
  const [frameworkId, setFrameworkId] = useState<CurriculumFramework>(DEMO_SCHOOL.primaryFramework)
  const framework = getFramework(frameworkId)

  const [levelId, setLevelId] = useState(framework.levels[0]?.id ?? '')
  const level = framework.levels.find((l) => l.id === levelId) ?? framework.levels[0]
  const [subjectId, setSubjectId] = useState(level?.subjects[0]?.id ?? '')
  const subject = level?.subjects.find((s) => s.id === subjectId) ?? level?.subjects[0]
  const topics = subject?.topics ?? []

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(topics[0] ? [topics[0].id] : []))
  const [focusTopicId, setFocusTopicId] = useState<string | undefined>(topics[0]?.id)
  const focusTopic = topics.find((t) => t.id === focusTopicId)

  const resetTree = (nextTopics: typeof topics) => {
    setExpanded(new Set(nextTopics[0] ? [nextTopics[0].id] : []))
    setFocusTopicId(nextTopics[0]?.id)
  }

  const selectFramework = (id: CurriculumFramework) => {
    const f = getFramework(id)
    const l = f.levels[0]
    setFrameworkId(id)
    setLevelId(l?.id ?? '')
    setSubjectId(l?.subjects[0]?.id ?? '')
    resetTree(l?.subjects[0]?.topics ?? [])
  }

  const selectLevel = (id: string) => {
    const l = framework.levels.find((x) => x.id === id)
    setLevelId(id)
    setSubjectId(l?.subjects[0]?.id ?? '')
    resetTree(l?.subjects[0]?.topics ?? [])
  }

  const selectSubject = (id: string) => {
    setSubjectId(id)
    resetTree(level?.subjects.find((s) => s.id === id)?.topics ?? [])
  }

  const toggleTopic = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else {
      next.add(id)
      setFocusTopicId(id)
    }
    setExpanded(next)
  }

  const scopedClasses = classesInScope(role)
  const classCounts: Record<CurriculumFramework, number> = {
    uganda: scopedClasses.filter((c) => c.framework === 'uganda').length,
    cambridge: scopedClasses.filter((c) => c.framework === 'cambridge').length,
  }
  const frameworkClasses = scopedClasses.filter((c) => c.framework === frameworkId)
  const levelClasses = frameworkClasses.filter((c) => level && c.level.includes(level.name))
  const levelClassIds = new Set(levelClasses.map((c) => c.id))
  const levelStudents = studentsInScope(role).filter((s) => levelClassIds.has(s.classId))

  const setAsPrimary = () => {
    setPrimary(frameworkId)
    notify(`${framework.name} set as school primary framework`, {
      description: 'Saved for preview — not persisted.',
      tone: 'info',
    })
  }

  const competencyCount = focusTopic?.competencies.length
  const objectiveCount = focusTopic?.competencies.reduce((n, c) => n + c.objectives.length, 0)

  return (
    <>
      <PageHeader
        title="Curriculum"
        description="Browse the curriculum structure that competencies, assessments and guidance are mapped to."
        meta={<FrameworkBadge framework={primary} />}
        actions={
          isAdmin ? (
            <ButtonLink to="/admin/structure" variant="secondary" icon={<Building2 className="size-4" aria-hidden />}>
              Per-class configuration
            </ButtonLink>
          ) : undefined
        }
      />

      <DemoNotice className="mb-6">
        <strong className="font-semibold text-ink">{CURRICULUM_DISCLAIMER}</strong> Codes prefixed “DEMO-” are placeholders. The
        expert-reviewed curriculum mapping will be loaded when the backend is connected.
      </DemoNotice>

      <section aria-labelledby="framework-heading">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="framework-heading" className="text-[15px] font-semibold text-ink">
              Framework
            </h2>
            <p className="text-sm text-ink-3">
              {isAdmin
                ? 'Choose a framework to review. Frameworks are configured per school, or per class in Academic Structure.'
                : 'Choose which framework to browse. Frameworks are configured per school or per class by administrators.'}
            </p>
          </div>
          {isAdmin && (
            <Button
              variant={frameworkId === primary ? 'secondary' : 'primary'}
              disabled={frameworkId === primary}
              onClick={setAsPrimary}
              icon={<Star className="size-4" aria-hidden />}
            >
              {frameworkId === primary ? 'School primary framework' : 'Set as school primary framework'}
            </Button>
          )}
        </div>
        <FrameworkPicker
          frameworks={CURRICULUM_FRAMEWORKS}
          value={frameworkId}
          onChange={selectFramework}
          primary={primary}
          classCounts={classCounts}
        />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={<Library className="size-5" aria-hidden />}
            title="Curriculum browser"
            description={`${framework.name} · demo structure`}
          />
          <div className="space-y-4 border-b border-line px-5 py-4">
            <HierarchyPath
              steps={[
                { kind: 'Framework', value: framework.shortName },
                { kind: 'Level', value: level?.name },
                { kind: 'Subject', value: subject?.name },
                { kind: 'Topic', value: focusTopic?.name },
                { kind: 'Competency', value: competencyCount !== undefined ? `${competencyCount} listed` : undefined },
                { kind: 'Learning objective', value: objectiveCount !== undefined ? `${objectiveCount} listed` : undefined },
              ]}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField
                label="Level"
                value={level?.id ?? ''}
                onChange={(e) => selectLevel(e.target.value)}
                options={framework.levels.map((l) => ({ value: l.id, label: `${l.name} · ${l.stage}` }))}
              />
              <SelectField
                label="Subject"
                value={subject?.id ?? ''}
                onChange={(e) => selectSubject(e.target.value)}
                disabled={!level?.subjects.length}
                options={
                  level?.subjects.length
                    ? level.subjects.map((s) => ({ value: s.id, label: s.name }))
                    : [{ value: '', label: 'No subjects loaded' }]
                }
              />
            </div>
          </div>
          {topics.length ? (
            <CurriculumTree topics={topics} expanded={expanded} onToggle={toggleTopic} />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="No demo content loaded for this level"
              description={
                subject
                  ? `${subject.name} at ${level?.name} has no demo topics yet. Curriculum content will be loaded once it has been reviewed.`
                  : `${level?.name ?? 'This level'} has no demo subjects yet. Curriculum content will be loaded once it has been reviewed.`
              }
            />
          )}
        </Card>

        <div className="space-y-6">
          {topics.length > 0 && <TopicSupportPanel topics={topics} students={levelStudents} />}
          {topics.length > 0 && <PrerequisitesPanel topics={topics} />}
          <Card>
            <CardHeader
              icon={<School className="size-5" aria-hidden />}
              title="Classes on this framework"
              description={isAdmin ? 'All classes in the school' : 'Classes you teach'}
            />
            <CardBody>
              {frameworkClasses.length ? (
                <ul className="space-y-2">
                  {frameworkClasses.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{c.name}</span>
                        <span className="block truncate text-xs text-ink-3">{c.level}</span>
                      </span>
                      <span className="tabular shrink-0 text-ink-3">{c.studentCount} students</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No classes in your scope use {FRAMEWORK_LABEL[frameworkId]}.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
