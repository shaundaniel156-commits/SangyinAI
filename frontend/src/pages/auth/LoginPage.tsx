import { ArrowLeft, ArrowRight, BookOpen, Building2, Globe2, Landmark, School } from 'lucide-react'
import { useId, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { RevealButton, TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useSession } from '../../context/SessionContext'
import { api, ApiError } from '../../lib/api'
import { classLevels, type SchoolSetup } from '../../lib/classLevels'
import { ROLE_HOME } from '../../data/users'
import { cn } from '../../lib/cn'
import { ACCENT, AuthCanvas, AuthHeader, LOGO_BLUE, PhotoBackdrop } from './AuthChrome'

/** "Primary 1 to Primary 7" */
const levelSpan = (s: SchoolSetup) => {
  const l = classLevels(s.type, s.framework)
  return `${l[0]} to ${l.at(-1)}`
}

/**
 * Standalone sign-in page, reached from the landing page at /. One form for every kind of account: the server knows
 * who is signing in. Below it, an administrator setting up a brand-new school can choose its type and curriculum;
 * the server saves that only at a school's very first administrator sign-in (backend auth/routes.ts). After that the
 * school's type and curriculum are changed in Settings or Manual feed (institution details).
 */
export function LoginPage() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [newSchool, setNewSchool] = useState(false)
  const [setup, setSetup] = useState<Partial<SchoolSetup>>({})
  const [forgotOpen, setForgotOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    // The new-school choice goes along only when it is open and complete.
    const school = newSchool && setup.type && setup.framework ? { type: setup.type, framework: setup.framework } : null
    const result = await signIn({ email, password, remember, school })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(ROLE_HOME[result.role])
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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Sangyin AI</h1>
          <p className="mt-1.5 text-sm text-white/60">Teachers, administrators, parents and students all sign in here. What you see depends on your account.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <DarkField
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
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
            {error && (
              <p role="alert" className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: LOGO_BLUE }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </form>

          {/* There is no sign-up: every account is made by the school. */}
          <p className="mt-5 text-xs text-white/50">
            Accounts are created by your school: the administrator adds teachers, and teachers add students and parents. Ask your school for your sign-in details.
          </p>
          <div className="mt-4 border-t border-white/10 pt-4">
            <button type="button" onClick={() => setNewSchool((v) => !v)} aria-expanded={newSchool} className="text-sm font-medium hover:underline" style={{ color: ACCENT }}>
              {newSchool ? 'Hide new-school setup' : 'Administrator setting up a brand-new school?'}
            </button>
            {newSchool && <NewSchoolSetup value={setup} onChange={setSetup} />}
          </div>
          </div>
        </div>
      </main>

      {forgotOpen && <ForgotPasswordModal initialEmail={email} onClose={() => setForgotOpen(false)} />}
    </AuthCanvas>
  )
}

/** For a brand-new school's first administrator sign-in only: the school's type and curriculum, sent with the sign-in. */
function NewSchoolSetup({ value, onChange }: { value: Partial<SchoolSetup>; onChange: (v: Partial<SchoolSetup>) => void }) {
  const { type, framework } = value
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/3 p-4">
      <p className="text-sm text-white/70">
        This counts only the first time an administrator signs in to a school that has no classes yet: it sets the type of school and
        curriculum, which decide the class names offered. For every other sign-in it changes nothing. Later, change them in Settings or
        Manual feed.
      </p>
      <ChoiceGroup
        legend="Type of school"
        value={type ?? null}
        onChange={(t) => onChange({ ...value, type: t })}
        options={[
          { value: 'primary', icon: School, label: 'Primary school', detail: framework === 'cambridge' ? 'Grade 1 to 6' : 'Primary 1 to 7' },
          { value: 'secondary', icon: Building2, label: 'Secondary school', detail: framework === 'cambridge' ? 'Grade 7 to 12' : 'Senior 1 to 6' },
        ]}
      />
      <ChoiceGroup
        legend="Curriculum"
        value={framework ?? null}
        onChange={(f) => onChange({ ...value, framework: f })}
        options={[
          { value: 'uganda', icon: Landmark, label: 'National', detail: 'Uganda national curriculum' },
          { value: 'cambridge', icon: Globe2, label: 'Cambridge', detail: type === 'secondary' ? 'Cambridge Secondary' : 'Cambridge Primary' },
        ]}
      />
      {type && framework ? (
        <p className="mt-5 flex items-start gap-2 text-sm text-white/70">
          <BookOpen className="mt-0.5 size-4 shrink-0" style={{ color: ACCENT }} aria-hidden />
          Classes: {levelSpan({ type, framework })}. Sent with your sign-in.
        </p>
      ) : (
        <p className="mt-5 text-xs text-white/50">Choose both, or simply sign in without them.</p>
      )}
    </div>
  )
}

function ChoiceGroup<T extends string>({ legend, value, onChange, options }: {
  legend: string
  value: T | null
  onChange: (v: T) => void
  options: { value: T; icon: typeof School; label: string; detail: string }[]
}) {
  return (
    <fieldset className="mt-6">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center text-sm font-medium transition-colors',
                active ? 'bg-[#5b93e6]/10' : 'border-white/10 bg-white/2 text-white/70 hover:border-white/25 hover:text-white/90',
              )}
              style={active ? { borderColor: ACCENT, color: ACCENT } : undefined}
            >
              <o.icon className="size-5" aria-hidden />
              {o.label}
              <span className="text-xs font-normal text-white/50">{o.detail}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Asks the server to email a reset link (valid 30 minutes). The reply is the same whether or not the email has an account. */
function ForgotPasswordModal({ initialEmail, onClose }: { initialEmail: string; onClose: () => void }) {
  const [address, setAddress] = useState(initialEmail.includes('@') ? initialEmail : '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setError(null)
    if (!address.includes('@')) return setError('Enter the email linked to your account.')
    setBusy(true)
    try {
      const res = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email: address.trim() } })
      setDone(res.message)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Reset your password"
      description={done ? undefined : 'Enter the email linked to your account and we will email you a reset link.'}
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={send} disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-sm text-ink-2">{done} Check your spam folder if it doesn&apos;t arrive in a few minutes.</p>
      ) : (
        <>
          <TextField label="Email" type="email" autoComplete="email" value={address} onChange={(e) => setAddress(e.target.value)} />
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  )
}

function DarkField({ label, type, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/85">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          {...props}
          className={`w-full rounded-md border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#5b93e6] focus:ring-1 focus:ring-[#5b93e6] ${isPassword ? 'pr-10' : ''}`}
        />
        {isPassword && <RevealButton shown={shown} onToggle={() => setShown((s) => !s)} className="text-white/50 hover:text-white" />}
      </div>
    </div>
  )
}
