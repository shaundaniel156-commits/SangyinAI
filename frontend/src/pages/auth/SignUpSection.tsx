// TEMPORARY: testing-period sign-up. To remove it, delete this file and its two lines in LoginPage.tsx
// (the import and <SignUpSection />). The server side is backend/src/signup, which lists the rest.

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { RevealButton } from '../../components/ui/Field'
import { useSession } from '../../context/SessionContext'
import { ROLE_HOME } from '../../data/users'
import { api, ApiError } from '../../lib/api'
import { ACCENT, LOGO_BLUE } from './AuthChrome'

/** Which codes the server asks for: the one it emailed, the one it sent by SMS, or both. */
interface Needs {
  email: boolean
  phone: boolean
}

interface CodeSent {
  /** Proof that this browser started the sign-up; sent back when asking for new codes and when finishing. */
  ticket?: string
  needs: Needs
  resendInSeconds: number
}

const UNREACHABLE = 'Could not reach the server. Check your connection and try again.'
const message = (e: unknown) => (e instanceof ApiError ? e.message : UNREACHABLE)
/** The seconds a "Please wait 12 minutes…" or "…wait 40 seconds…" reply asks for (0 when it asks for none). */
function waitIn(text: string): number {
  const m = /wait (\d+) (second|minute)/.exec(text)
  return m ? Number(m[1]) * (m[2] === 'minute' ? 60 : 1) : 0
}
const waitText = (seconds: number) => (seconds > 60 ?`${Math.ceil(seconds / 60)} min` : `${seconds}s`)
const inputClass = 'w-full rounded-md border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#5b93e6] focus:ring-1 focus:ring-[#5b93e6]'

/**
 * Sign-up, shown below the sign-in form while the server says it is open (SIGNUP_ENABLED). Two steps: your details,
 * then the 6-digit codes the server asks for (one from your email, one from a text message, or both). It creates a
 * new school with you as its administrator, then signs you in.
 */
export function SignUpSection() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'code'>('details')
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [schoolType, setSchoolType] = useState('primary')
  const [framework, setFramework] = useState('uganda')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [needs, setNeeds] = useState<Needs>({ email: true, phone: false })
  const [ticket, setTicket] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [wait, setWait] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Hidden unless the server says sign-up is open (also when the server cannot be reached).
  useEffect(() => {
    let current = true
    api<{ enabled: boolean; needs?: Needs }>('/auth/signup')
      .then((r) => {
        if (!current) return
        setEnabled(r.enabled === true)
        if (r.needs) setNeeds(r.needs)
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [])

  // Counts down the seconds until another code can be asked for.
  useEffect(() => {
    if (wait <= 0) return
    const timer = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [wait])

  if (!enabled) return null
  const both = needs.email && needs.phone

  const sendDetails = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    // The form is noValidate, so the messages here and the server's (one per field) are the ones people see.
    if (!name.trim() || !schoolName.trim() || !email.trim() || !phone.trim()) return setError('Fill in every field.')
    if (password.length < 8) return setError('The password must be at least 8 characters.')
    setBusy(true)
    try {
      const sent = await api<CodeSent>('/auth/signup', { body: { name, schoolName, schoolType, framework, email, phone, password } })
      setTicket(sent.ticket ?? '')
      setNeeds(sent.needs)
      setEmailCode('')
      setPhoneCode('')
      setWait(sent.resendInSeconds)
      setStep('code')
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const sent = await api<CodeSent>('/auth/signup/resend', { body: { ticket } })
      setNeeds(sent.needs)
      setEmailCode('')
      setPhoneCode('')
      setWait(sent.resendInSeconds)
      setNotice(both ? 'New codes are on their way. The old ones no longer work.' : 'A new code is on its way. The old one no longer works.')
    } catch (err) {
      // Asked to wait (too soon, or locked out after wrong codes): the button counts the wait down.
      setWait((w) => Math.max(w, waitIn(message(err))))
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  const sendCode = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if ((needs.email && !/^\d{6}$/.test(emailCode)) || (needs.phone && !/^\d{6}$/.test(phoneCode))) {
      return setError(both ? 'Enter both 6-digit codes: the one from your email and the one from your text message.' : 'Enter the 6-digit code we sent you.')
    }
    setBusy(true)
    try {
      await api('/auth/signup/verify', { body: { ticket, ...(needs.email ? { emailCode } : {}), ...(needs.phone ? { phoneCode } : {}) } })
    } catch (err) {
      setBusy(false)
      setWait((w) => Math.max(w, waitIn(message(err))))
      return setError(message(err))
    }
    // The account now exists: sign in with it the usual way.
    const result = await signIn({ email, password, remember: true })
    setBusy(false)
    if (!result.ok) {
      setStep('details')
      setOpen(false)
      return setNotice('Your account is ready. Sign in above with your email and password.')
    }
    navigate(ROLE_HOME[result.role])
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-sm font-medium hover:underline" style={{ color: ACCENT }}>
        {open ? 'Hide sign-up' : 'New here? Create an account'}
      </button>
      {!open && notice && (
        <p role="status" className="mt-3 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {notice}
        </p>
      )}

      {open && step === 'details' && (
        <form onSubmit={sendDetails} noValidate className="mt-4 space-y-4">
          <p className="text-sm text-white/70">
            Open while Sangezi Academia is being tested. You get a new school with yourself as its administrator; you can then add classes,
            teachers, students and parents.
          </p>
          <Field label="Your full name" name="name" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Name of your school" name="organization" autoComplete="organization" required maxLength={120} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <Choice label="Type of school" name="schoolType" value={schoolType} onChange={setSchoolType}>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </Choice>
            <Choice label="Curriculum" name="framework" value={framework} onChange={setFramework}>
              <option value="uganda">National</option>
              <option value="cambridge">Cambridge</option>
            </Choice>
          </div>
          <Field label="Email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Phone number" name="tel" type="tel" autoComplete="tel" required placeholder="0772 123456 or +256 772 123456" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field label="Choose a password" name="new-password" type="password" autoComplete="new-password" required placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Problem text={error} />
          <Submit busy={busy} label="Send my code" busyLabel="Sending your code…" />
          <p className="text-xs text-white/50">
            {both ? 'We send one 6-digit code to your email and another to your phone. You type both in on the next step.' : needs.email ? 'We email you a 6-digit code. You type it in on the next step.' : 'We text you a 6-digit code. You type it in on the next step.'}
          </p>
        </form>
      )}

      {open && step === 'code' && (
        <form onSubmit={sendCode} noValidate className="mt-4 space-y-4">
          <p className="text-sm text-white/70">
            {both ? (
              <>
                We emailed one 6-digit code to <strong className="text-white">{email}</strong> and texted a different one to <strong className="text-white">{phone}</strong>.
                Enter both. They work for 10 minutes.
              </>
            ) : needs.email ? (
              <>
                We emailed a 6-digit code to <strong className="text-white">{email}</strong>. Enter it below. It works for 10 minutes.
              </>
            ) : (
              <>
                We texted a 6-digit code to <strong className="text-white">{phone}</strong>. Enter it below. It works for 10 minutes.
              </>
            )}
          </p>
          {needs.email && (
            <Field
              label="Code from your email"
              name="emailCode"
              required
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              placeholder="123456"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="tabular text-center text-lg tracking-[0.4em]"
            />
          )}
          {needs.phone && (
            <Field
              label="Code from your text message"
              name="phoneCode"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="tabular text-center text-lg tracking-[0.4em]"
            />
          )}
          <Problem text={error} />
          {notice && (
            <p role="status" className="text-sm text-white/70">
              {notice}
            </p>
          )}
          <Submit busy={busy} label="Create my account" busyLabel="Checking…" />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('details')
                setError(null)
                setNotice(null)
              }}
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Change email or phone
            </button>
            <button type="button" onClick={resend} disabled={busy || wait > 0} className="font-medium hover:underline disabled:text-white/40 disabled:no-underline" style={wait > 0 ? undefined : { color: ACCENT }}>
              {wait > 0 ? `Send ${both ? 'new codes' : 'a new code'} in ${waitText(wait)}` : both ? 'Send new codes' : 'Send a new code'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Problem({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p role="alert" className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {text}
    </p>
  )
}

function Submit({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: LOGO_BLUE }}
    >
      {busy ? busyLabel : label}
      <ArrowRight className="size-4" aria-hidden />
    </button>
  )
}

// The same dark field as the sign-in form (kept here so this file can be deleted by itself).
function Field({ label, type, className, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/85">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={isPassword && shown ? 'text' : type} {...props} className={`${inputClass} ${isPassword ? 'pr-10' : ''} ${className ?? ''}`} />
        {isPassword && <RevealButton shown={shown} onToggle={() => setShown((s) => !s)} className="text-white/50 hover:text-white" />}
      </div>
    </div>
  )
}

function Choice({ label, name, value, onChange, children }: { label: string; name: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/85">
        {label}
      </label>
      <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {children}
      </select>
    </div>
  )
}
