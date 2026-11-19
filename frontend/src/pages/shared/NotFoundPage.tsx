import { ArrowRight, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useSession } from '../../context/SessionContext'
import { ROLE_HOME } from '../../data/users'
import { AuthCanvas, AuthHeader, LOGO_BLUE, PhotoBackdrop } from '../auth/AuthChrome'

/** An address that is not a page, for someone signed in: shown inside the app, with a way back to their home page. */
export function NotFoundPage() {
  const { role } = useSession()
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="There is no page at this address. Check the address, or go back to your home page."
        action={<ButtonLink to={ROLE_HOME[role]}>Go to your home page</ButtonLink>}
      />
    </Card>
  )
}

/** The same, for someone not signed in: it looks like the sign-in page and leads there. */
export function PublicNotFoundPage() {
  return (
    <AuthCanvas>
      <AuthHeader>
        <Link to="/login" className="transition-colors hover:text-white">
          Sign in
        </Link>
      </AuthHeader>
      <main className="relative isolate flex flex-1 items-center justify-center px-4 py-12">
        <PhotoBackdrop />
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#070b14]/85 p-6 text-center shadow-2xl backdrop-blur sm:p-8">
          <Compass className="mx-auto size-10 text-white/60" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="mt-1.5 text-sm text-white/60">There is no page at this address on Sangezi Academia. Check the address, or go to the sign-in page.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: LOGO_BLUE }}
          >
            Go to sign in
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </main>
    </AuthCanvas>
  )
}
