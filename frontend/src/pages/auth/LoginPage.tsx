import { ArrowLeft, ArrowRight, GraduationCap, HeartHandshake, Presentation, School } from 'lucide-react'
import { useId, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSession } from '../../context/SessionContext'
import { DEMO_USERS, ROLE_HOME, ROLE_LABEL } from '../../data/users'
import { cn } from '../../lib/cn'
import type { Role } from '../../types'
import { ACCENT, AuthCanvas, AuthHeader, LOGO_BLUE, PhotoBackdrop } from './AuthChrome'

const ROLE_OPTIONS: { role: Role; icon: typeof School; heading: string; blurb: string }[] = [
  { role: 'teacher', icon: Presentation, heading: 'Sign in to your teaching workspace', blurb: 'Review diagnostics, approve guidance and track your classes.' },
  { role: 'admin', icon: School, heading: 'Sign in to school administration', blurb: 'Manage users, classes and curriculum configuration.' },
  { role: 'parent', icon: HeartHandshake, heading: 'Welcome, parent or guardian', blurb: 'See how your child is doing and how you can help at home.' },
  { role: 'student', icon: GraduationCap, heading: 'Hi there! Ready to learn?', blurb: 'Continue your practice and see your progress.' },
]

/** Standalone sign-in page, reached from the landing page at /. */
export function LoginPage() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('teacher')
  const [email, setEmail] = useState(DEMO_USERS.teacher.email)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [forgotOpen, setForgotOpen] = useState(false)
  const current = ROLE_OPTIONS.find((r) => r.role === role)!

  const chooseRole = (r: Role) => {
    setRole(r)
    setEmail(DEMO_USERS[r].email)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Demo only: no credentials are checked. Selecting a role opens that interface.
    signIn(role)
    navigate(ROLE_HOME[role])
  }

  return (
    <AuthCanvas>
      <AuthHeader>
        <Link to="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
          <ArrowLeft className="size-4" aria-hidden />
          Back to home
        </Link>
      </AuthHeader>

      <main className="relative isolate flex flex-1 items-center justify-center px-4 py-12">
        <PhotoBackdrop />
        <div className="group relative w-full max-w-md">
          {/* Blue ambient light; brightens and spreads on hover */}
          <div
            className="pointer-events-none absolute -inset-4 rounded-4xl bg-brand-600/40 opacity-60 blur-2xl transition-all duration-300 group-hover:-inset-7 group-hover:opacity-100"
            aria-hidden
          />
          <div className="relative rounded-2xl border border-white/10 bg-[#070b14]/85 p-6 shadow-2xl backdrop-blur transition duration-300 group-hover:border-[#5b93e6]/60 group-hover:shadow-[0_0_40px_rgba(91,147,230,0.35)] motion-safe:group-hover:-translate-y-1 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{current.heading}</h1>
          <p className="mt-1.5 text-sm text-white/60">{current.blurb}</p>

          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-medium">I am a…</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ROLE_OPTIONS.map((o) => {
                const active = o.role === role
                return (
                  <button
                    key={o.role}
                    type="button"
                    onClick={() => chooseRole(o.role)}
                    aria-pressed={active}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors',
                      active ? 'bg-[#5b93e6]/10' : 'border-white/10 bg-white/2 text-white/60 hover:border-white/25 hover:text-white/80',
                    )}
                    style={active ? { borderColor: ACCENT, color: ACCENT } : undefined}
                  >
                    <o.icon className="size-5" aria-hidden />
                    {o.role === 'admin' ? 'Administrator' : ROLE_LABEL[o.role]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <DarkField
              label={role === 'student' ? 'Username or email' : 'Email or username'}
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <DarkField
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded accent-[#5b93e6]"
                />
                Remember me
              </label>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-sm font-medium hover:underline" style={{ color: ACCENT }}>
                Forgot password?
              </button>
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: LOGO_BLUE }}
            >
              Sign in
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </form>

          <p className="mt-6 rounded-lg border border-dashed border-white/15 px-3.5 py-2.5 text-center text-xs text-white/50">
            Prototype demo — sign-in is not connected. Choose a role and select <span className="font-medium text-white/80">Sign in</span> to preview that interface.
          </p>
          </div>
        </div>
      </main>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset your password"
        description="Enter the email linked to your account."
        footer={
          <>
            <Button variant="secondary" onClick={() => setForgotOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setForgotOpen(false)}>Send reset link</Button>
          </>
        }
      >
        <TextField label="Email" type="email" defaultValue={email} />
        <p className="mt-3 text-xs text-ink-3">Prototype: password reset will be available once authentication is connected. No email is sent.</p>
      </Modal>
    </AuthCanvas>
  )
}

function DarkField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/85">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#5b93e6] focus:ring-1 focus:ring-[#5b93e6]"
      />
    </div>
  )
}
