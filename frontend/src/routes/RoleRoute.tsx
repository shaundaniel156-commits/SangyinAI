import { Lock } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { useSession } from '../context/SessionContext'
import { ROLE_HOME } from '../data/users'
import type { Role } from '../types'

/**
 * Lets the pages inside through only for these kinds of account. Anyone else who types the address sees a plain
 * notice and a way to their own home page, instead of an empty page meant for someone else.
 */
export function RoleRoute({ roles }: { roles: Role[] }) {
  const { role } = useSession()
  if (roles.includes(role)) return <Outlet />
  return (
    <Card>
      <EmptyState
        icon={Lock}
        title="This page is not available for your account"
        description="It is meant for a different kind of account. Everything for yours is in the menu."
        action={<ButtonLink to={ROLE_HOME[role]}>Go to your home page</ButtonLink>}
      />
    </Card>
  )
}
