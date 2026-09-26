import { ChevronRight, Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Tabs } from '../../../components/ui/Tabs'
import { useAiAssessments } from '../../../context/AiAssessmentsContext'
import { getClass } from '../../../data/classes'
import { formatDate } from '../../../lib/format'
import type { AiAssessmentStatus } from '../../../types'
import { WorkflowSteps } from './WorkflowSteps'

/** Teacher home for AI-drafted assessments: drafts awaiting review and ones already sent. */
export function AiAssessmentsPage() {
  const { items } = useAiAssessments()
  const [tab, setTab] = useState<AiAssessmentStatus>('draft')
  const drafts = items.filter((a) => a.status === 'draft')
  const sent = items.filter((a) => a.status === 'sent')
  const list = tab === 'draft' ? drafts : sent

  return (
    <>
      <PageHeader
        title="AI Assessment Builder"
        description="Turn report data into targeted practice for the students who need it. The AI drafts, you review and approve, then it goes to students — with a home-support note for their parents."
        actions={
          <ButtonLink to="/ai-assessments/new" icon={<Sparkles className="size-4" aria-hidden />}>
            Generate new assessment
          </ButtonLink>
        }
      />
      <WorkflowSteps current={-1} className="mb-8" />

      <Card>
        <div className="px-6 pt-3">
          <Tabs
            label="Assessment status"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'draft', label: 'Awaiting your review', count: drafts.length },
              { id: 'sent', label: 'Sent to students', count: sent.length },
            ]}
          />
        </div>
        {list.length === 0 ? (
          <EmptyState
            icon={Wand2}
            title={tab === 'draft' ? 'No drafts to review' : 'Nothing sent yet'}
            description={
              tab === 'draft'
                ? 'Generate an assessment from your latest report data. It will wait here until you approve it.'
                : 'Approved assessments appear here once they have been sent to students.'
            }
            action={tab === 'draft' && <ButtonLink to="/ai-assessments/new">Generate new assessment</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((a) => (
              <li key={a.id}>
                <Link to={`/ai-assessments/${a.id}`} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                    <Sparkles className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{a.title}</span>
                    <span className="block truncate text-sm text-ink-3">
                      {getClass(a.classId)?.name} · {a.subject} · {a.questions.length} questions · {a.studentIds.length} students
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    {a.status === 'draft' ? <StatusBadge tone="warn">Needs review</StatusBadge> : <StatusBadge tone="good">Sent</StatusBadge>}
                    <span className="mt-1 block text-xs text-ink-3">
                      {a.status === 'draft' ? `Drafted ${formatDate(a.createdOn)}` : `Due ${formatDate(a.dueDate)}`}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
