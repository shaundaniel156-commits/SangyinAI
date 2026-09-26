import { Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GuidanceCard } from '../../components/domain/GuidanceCard'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar } from '../../components/ui/FilterBar'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { Tabs } from '../../components/ui/Tabs'
import { useGuidanceReview } from '../../context/GuidanceReviewContext'
import { useSession } from '../../context/SessionContext'
import { classesInScope, guidanceInScope } from '../../data/selectors'
import { getStudent } from '../../data/students'
import type { GuidanceStatus } from '../../types'

type TabId = 'all' | GuidanceStatus

export function GuidancePage() {
  const { role } = useSession()
  const { resolve } = useGuidanceReview()
  const [tab, setTab] = useState<TabId>('pending_review')
  const [query, setQuery] = useState('')
  const [classId, setClassId] = useState('all')

  const plans = useMemo(() => guidanceInScope(role).map(resolve), [role, resolve])
  const count = (s: GuidanceStatus) => plans.filter((p) => p.status === s).length
  const rows = plans.filter((p) => {
    const s = getStudent(p.studentId)
    return (
      (tab === 'all' || p.status === tab) &&
      (classId === 'all' || s?.classId === classId) &&
      `${s?.name} ${p.competencyGap}`.toLowerCase().includes(query.trim().toLowerCase())
    )
  })
  const nextPending = plans.find((p) => p.status === 'pending_review')

  return (
    <>
      <PageHeader
        title="AI Guidance"
        description="Teaching plans suggested for each identified competency gap. Nothing reaches students or parents until you approve it."
        actions={
          nextPending && (
            <ButtonLink to={`/guidance/${nextPending.id}`} icon={<Sparkles className="size-4" aria-hidden />}>
              Review next plan
            </ButtonLink>
          )
        }
      />
      <Card>
        <div className="px-4 pt-2">
          <Tabs
            label="Guidance status"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'pending_review', label: 'Awaiting review', count: count('pending_review') },
              { id: 'approved', label: 'Approved', count: count('approved') },
              { id: 'revision_requested', label: 'Revision requested', count: count('revision_requested') },
              { id: 'overridden', label: 'Overridden', count: count('overridden') },
              { id: 'all', label: 'All', count: plans.length },
            ]}
          />
        </div>
        <div className="border-b border-line p-4">
          <FilterBar
            search={<SearchBar value={query} onChange={setQuery} placeholder="Search student or topic…" label="Search guidance" />}
            filters={[
              {
                id: 'class',
                label: 'Class',
                value: classId,
                onChange: setClassId,
                options: [{ value: 'all', label: 'All classes' }, ...classesInScope(role).map((c) => ({ value: c.id, label: c.name }))],
              },
            ]}
          />
        </div>
        {rows.length ? (
          <div className="grid grid-cols-1 gap-x-4 divide-y divide-line px-2 py-1 lg:grid-cols-2 lg:divide-y-0">
            {rows.map((p) => (
              <div key={p.id} className="lg:border-b lg:border-line">
                <GuidanceCard plan={p} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="No plans here" description="There are no guidance plans matching this view." />
        )}
      </Card>
      <DemoNotice className="mt-6">Guidance plans are sample content for UI review. AI generation is not connected in this prototype.</DemoNotice>
    </>
  )
}
