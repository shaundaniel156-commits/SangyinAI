import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { PRACTICE_ACTIVITIES } from '../../data/practice'
import type { PracticeActivity, PracticeStatus } from '../../types'
import { FromTeacherSection } from './components/FromTeacherSection'
import { PracticeActivityCard } from './components/PracticeActivityCard'
import { SamplePracticeModal } from './components/SamplePracticeModal'

const GROUPS: { status: PracticeStatus; title: string }[] = [
  { status: 'in_progress', title: 'In progress' },
  { status: 'not_started', title: 'Up next' },
  { status: 'completed', title: 'Completed' },
]

export function StudentPracticePage() {
  const [open, setOpen] = useState<PracticeActivity | null>(null)

  return (
    <>
      <PageHeader title="Practice" description="Short activities to help you build your skills." />
      <div className="space-y-8">
        <FromTeacherSection />
        {GROUPS.map((g) => {
          const items = PRACTICE_ACTIVITIES.filter((a) => a.status === g.status)
          if (items.length === 0) return null
          return (
            <section key={g.status} aria-labelledby={`practice-${g.status}`}>
              <h2 id={`practice-${g.status}`} className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
                {g.title}
                <span className="tabular rounded-full bg-surface-3 px-2 text-xs font-medium text-ink-3">{items.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((a) => (
                  <PracticeActivityCard key={a.id} activity={a} onOpen={setOpen} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <SamplePracticeModal activity={open} onClose={() => setOpen(null)} />
    </>
  )
}
