import { CheckCircle2, CircleSlash, MailQuestion } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { AccountStatus } from '../../../data/adminUsers'

const STATUS = {
  active: { tone: 'good', icon: CheckCircle2, label: 'Active' },
  invited: { tone: 'info', icon: MailQuestion, label: 'Invited' },
  inactive: { tone: 'neutral', icon: CircleSlash, label: 'Inactive' },
} as const

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: STATUS.active.label,
  invited: STATUS.invited.label,
  inactive: STATUS.inactive.label,
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const s = STATUS[status]
  return (
    <StatusBadge tone={s.tone} icon={s.icon}>
      {s.label}
    </StatusBadge>
  )
}
