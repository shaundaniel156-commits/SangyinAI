import { CheckCircle2, Clock, RotateCcw, ShieldAlert } from 'lucide-react'
import { GUIDANCE_STATUS_LABEL } from '../../data/guidance'
import type { GuidanceStatus } from '../../types'
import { StatusBadge, type Tone } from '../ui/StatusBadge'

const TONE: Record<GuidanceStatus, Tone> = {
  pending_review: 'info',
  approved: 'good',
  revision_requested: 'warn',
  overridden: 'neutral',
}

const ICON = { pending_review: Clock, approved: CheckCircle2, revision_requested: RotateCcw, overridden: ShieldAlert }

export function GuidanceStatusBadge({ status }: { status: GuidanceStatus }) {
  return (
    <StatusBadge tone={TONE[status]} icon={ICON[status]}>
      {GUIDANCE_STATUS_LABEL[status]}
    </StatusBadge>
  )
}
