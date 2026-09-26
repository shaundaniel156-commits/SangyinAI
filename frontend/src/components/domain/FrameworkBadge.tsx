import { BookMarked } from 'lucide-react'
import type { CurriculumFramework } from '../../types'
import { StatusBadge } from '../ui/StatusBadge'

export function FrameworkBadge({ framework }: { framework: CurriculumFramework }) {
  return (
    <StatusBadge tone={framework === 'uganda' ? 'info' : 'accent'} icon={BookMarked}>
      {framework === 'uganda' ? 'Uganda National Curriculum' : 'Cambridge International'}
    </StatusBadge>
  )
}
