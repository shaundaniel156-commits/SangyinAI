import { Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { AssistantCard, useAiChat } from '../../components/domain/AiChat'
import { GuidanceCard } from '../../components/domain/GuidanceCard'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
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
import { GenerateGuidanceModal } from './guidance/GenerateGuidanceModal'

type TabId = 'all' | GuidanceStatus

export function GuidancePage() {
  const { role } = useSession()
  const { resolve } = useGuidanceReview()
  const [tab, setTab] = useState<TabId>('pending_review')
  const [query, setQuery] = useState('')
  const [classId, setClassId] = useState('all')
  const [generating, setGenerating] = useState(false)

  // Recomputed on every draw: the list changes when the AI adds plans.
  const plans = guidanceInScope(role).map(resolve)
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
  // What the AI should know when the teacher asks it something on this page.
  const chat = useAiChat({
    context: () =>
      `On the AI Guidance page, where guidance plans the AI drafted for students' competency gaps wait for the teacher's review. ${count('pending_review')} awaiting review, ${count('approved')} approved. Gaps awaiting review: ${
        plans
          .filter((p) => p.status === 'pending_review')
          .slice(0, 15)
          .map((p) => `${p.competencyGap} (${p.subject})`)
          .join('; ') || 'none'
      }. Generate guidance drafts new plans; opening a plan lets the teacher edit it, have it rewritten, or approve it, which shares it with the student and parents. You cannot create or change plans from this chat.`,
  })

  return (
    <>
      <PageHeader
        title="AI Guidance"
        description="Teaching plans suggested for each identified competency gap. Nothing reaches students or parents until you approve it."
        actions={
          <>
            <Button variant={nextPending ? 'secondary' : 'primary'} onClick={() => setGenerating(true)} icon={<Wand2 className="size-4" aria-hidden />}>
              Generate guidance
            </Button>
            {nextPending && (
              <ButtonLink to={`/guidance/${nextPending.id}`} icon={<Sparkles className="size-4" aria-hidden />}>
                Review next plan
              </ButtonLink>
            )}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
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
          <EmptyState
            icon={Sparkles}
            title="No plans here"
            description={plans.length ? 'There are no guidance plans matching this view.' : 'Let the AI draft a guidance plan for each student’s competency gaps. You review, edit and approve before anything is shared.'}
            action={
              plans.length === 0 && (
                <Button onClick={() => setGenerating(true)} icon={<Wand2 className="size-4" aria-hidden />}>
                  Generate guidance
                </Button>
              )
            }
          />
        )}
      </Card>
        <AssistantCard
          chat={chat}
          className="xl:sticky xl:top-24 xl:self-start"
          description="Ask anything while you review — how to teach a gap, how to group students, what to tell parents."
          emptyHint="For example “How should I teach ratio to a learner who is far behind?” or “Which of these gaps should I start with?”"
        />
      </div>
      {generating && <GenerateGuidanceModal open onClose={() => setGenerating(false)} />}
    </>
  )
}
