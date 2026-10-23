import { BookMarked } from 'lucide-react'
import { FRAMEWORK_LABEL } from '../../data/curriculum'
import type { CurriculumFramework } from '../../types'
import { StatusBadge } from '../ui/StatusBadge'

export function FrameworkBadge({ framework }: { framework: CurriculumFramework }) {
  return (
    <StatusBadge tone={framework === 'uganda' ? 'info' : framework === 'cambridge' ? 'accent' : 'neutral'} icon={BookMarked}>
      {framework === 'uganda' ? 'Uganda National Curriculum' : FRAMEWORK_LABEL[framework]}
    </StatusBadge>
  )
}
