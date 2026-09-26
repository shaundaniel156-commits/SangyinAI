import { Target, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { LevelBadge } from '../../components/ui/StatusBadge'
import { getChildSummary } from './components/childSummary'
import { useSelectedChild } from './components/useSelectedChild'

export function ParentChildrenPage() {
  const { children, setChildId } = useSelectedChild()
  const navigate = useNavigate()

  const open = (id: string, to: string) => {
    setChildId(id)
    navigate(to)
  }

  return (
    <>
      <PageHeader title="My Children" description="The children linked to your account." />
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        {children.map((child) => {
          const summary = getChildSummary(child)
          return (
            <Card key={child.id} as="article">
              <CardBody>
                <div className="flex items-center gap-4">
                  <Avatar initials={child.initials} size="lg" />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-ink">{child.name}</h2>
                    <p className="truncate text-sm text-ink-3">{summary.className}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-3">Overall</dt>
                    <dd>
                      <LevelBadge level={summary.overallLevel} friendly />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-3">Current Learning Focus</dt>
                    <dd className="text-right font-medium text-ink">{summary.focus}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-3">Since last term</dt>
                    <dd className="text-right text-ink-2">{summary.progressWords}</dd>
                  </div>
                </dl>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" aria-label={`Progress for ${child.name}`} icon={<TrendingUp className="size-4" aria-hidden />} onClick={() => open(child.id, '/parent/progress')}>
                    Progress
                  </Button>
                  <Button size="sm" aria-label={`Learning focus for ${child.name}`} icon={<Target className="size-4" aria-hidden />} onClick={() => open(child.id, '/parent/focus')}>
                    Learning focus
                  </Button>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </>
  )
}
