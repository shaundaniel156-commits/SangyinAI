import { Compass } from 'lucide-react'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSession } from '../../context/SessionContext'
import { ROLE_HOME } from '../../data/users'

export function NotFoundPage() {
  const { role } = useSession()
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist or is not available for your role."
        action={<ButtonLink to={ROLE_HOME[role]}>Go to dashboard</ButtonLink>}
      />
    </Card>
  )
}
