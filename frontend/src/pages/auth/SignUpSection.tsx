// TEMPORARY: testing-period sign-up. To remove it, delete this file and its two lines in LoginPage.tsx
// (the import and <SignUpSection />). The server side is backend/src/signup, which lists the rest.

import { ArrowLeft, ArrowRight, Mail, MessageSquareText } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { RevealButton } from '../../components/ui/Field'
import { useSession } from '../../context/SessionContext'
import { ROLE_HOME } from '../../data/users'
import { api, ApiError } from '../../lib/api'
import { cn } from '../../lib/cn'
import { ACCENT, LOGO_BLUE } from './AuthChrome'

/** How a code is sent: by email or by text message. */
type Channel = 'email' | 'sms'
/** Which of the two the server can use right now. */
type Channels = Record<Channel, boolean>

// channel, sentTo and channels are missing in a reply from the server from before 2026-11-21 (email only).
interface CodeSent {
  /** Proof that this browser started the sign-up; sent back when asking for a new code and when finishing. */
  ticket?: string
  channel?: Channel
  /** Where the code went, partly hidden: "s•••@gmail.com" or "07•• ••• 432". */
  sentTo?: string
  channels?: Channels
  resendInSeconds: number
}
const EMAIL_ONLY: Channels = { email: true, sms: false }

const UNREACHABLE = 'Could not reach the server. Check your connection and try again.'
const message = (e: unknown) => (e instanceof ApiError ? e.message : UNREACHABLE)
/** The seconds a "Please wait 12 minutes…" or "…wait 40 seconds…" reply asks for (0 when it asks for none). */
function waitIn(text: string): number {
  const m = /wait (\d+) (second|minute)/.exec(text)
  return m ? Number(m[1]) * (m[2] === 'minute' ? 60 : 1) : 0
}
const waitText = (seconds: number) => (seconds > 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds}s`)
const inputClass = 'w-full rounded-md border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#5b93e6] focus:ring-1 focus:ring-[#5b93e6]'
const other = (channel: Channel): Channel => (channel === 'email' ? 'sms' : 'email')

/**
 * Sign-up, shown below the sign-in form while the server says it is open (SIGNUP_ENABLED). Two steps: your details
 * and how to get your code (by email or by text message, when the server offers both), then the 6-digit code. It
 * creates a new school with you as its administrator, then signs you in.
 */
export function SignUpSection() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState(false)
  const [channels, setChannels] = useState<Channels>(EMAIL_ONLY)
  // Text messages are being tried out: they go to the Africa's Talking simulator, not to phones.
  const [smsTest, setSmsTest] = useState(false)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'code'>('details')
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [schoolType, setSchoolType] = useState('primary')
  const [framework, setFramework] = useState('uganda')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [chosen, setChosen] = useState<Channel>('email')
  // The code step: which way the code went, and where (partly hidden).
  const [sent, setSent] = useState<{ channel: Channel; to: string }>({ channel: 'email', to: '' })
  const [ticket, setTicket] = useState('')
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Hidden unless the server says sign-up is open (also when the server cannot be reached).
  useEffect(() => {
    let current = true
    api<{ enabled: boolean; channels?: Channels; smsTest?: boolean }>('/auth/signup')
      .then((r) => {
        if (!current) return
        setEnabled(r.enabled === true)
        if (r.channels) setChannels(r.channels)
        setSmsTest(r.smsTest === true)
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
  const choice = channels.email && channels.sms
  // The way the code will go: the person's choice when there is one, else the only way on offer.
  const channel: Channel = choice ? chosen : channels.sms ? 'sms' : 'email'

  const codeWasSent = (reply: CodeSent): Channel => {
    // A reply that does not say (an older server): the code went by email, and that is the only way.
    const went = reply.channel === 'sms' ? 'sms' : 'email'
    setChannels(reply.channels ?? EMAIL_ONLY)
    setSent({ channel: went, to: reply.sentTo ?? (went === 'sms' ? phone : email) })
    setCode('')
    setWait(reply.resendInSeconds)
    return went
  }

  const sendDetails = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    // The form is noValidate, so the messages here and the server's (one per field) are the ones people see.
    if (!name.trim() || !schoolName.trim() || !email.trim() || !phone.trim()) return setError('Fill in every field.')
    if (password.length < 8) return setError('The password must be at least 8 characters.')
    setBusy(true)
    try {
      const reply = await api<CodeSent>('/auth/signup', { body: { name, schoolName, schoolType, framework, email, phone, password, channel } })
      setTicket(reply.ticket ?? '')
      codeWasSent(reply)
      setStep('code')
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  // A new code the same way, or (to) the other way.
  const resend = async (to?: Channel) => {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const reply = await api<CodeSent>('/auth/signup/resend', { body: { ticket, ...(to ? { channel: to } : {}) } })
      const went = codeWasSent(reply)
      setNotice(`A new code is on its way by ${went === 'sms' ? 'text message' : 'email'}. The old one no longer works.`)
    } catch (err) {
      // Asked to wait (too soon, or locked out after wrong codes): the buttons count the wait down.
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
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code we sent you.')
    setBusy(true)
    try {
      // emailCode: compatibility with the server from before 2026-11-21 (its name for an emailed code); remove in a later release.
      await api('/auth/signup/verify', { body: { ticket, code, ...(sent.channel === 'email' ? { emailCode: code } : {}) } })
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

  const testNote = smsTest && <p className="text-xs text-amber-200/80">Test mode: texts appear in the Africa’s Talking simulator, not on phones.</p>

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
          {choice && (
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-white/85">Send my code by</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { value: 'email', icon: Mail, label: 'Email' },
                    { value: 'sms', icon: MessageSquareText, label: 'Text message (SMS)' },
                  ] as const
                ).map((o) => {
                  const active = chosen === o.value
                  return (
                    <label
                      key={o.value}
                      className={cn(
                        'flex cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-2.5 text-center text-sm font-medium transition-colors has-focus-visible:ring-1 has-focus-visible:ring-[#5b93e6]',
                        active ? 'bg-[#5b93e6]/10' : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white/90',
                      )}
                      style={active ? { borderColor: ACCENT, color: ACCENT } : undefined}
                    >
                      <input type="radio" name="channel" value={o.value} checked={active} onChange={() => setChosen(o.value)} className="sr-only" />
                      <o.icon className="size-4 shrink-0" aria-hidden />
                      {o.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}
          {channel === 'sms' && testNote}
          <Problem text={error} />
          <Submit busy={busy} label="Send my code" busyLabel="Sending your code…" />
          <p className="text-xs text-white/50">
            {channel === 'sms' ? 'We text a 6-digit code to your phone number. You type it in on the next step.' : 'We email you a 6-digit code. You type it in on the next step.'}
          </p>
        </form>
      )}

      {open && step === 'code' && (
        <form onSubmit={sendCode} noValidate className="mt-4 space-y-4">
          <p className="text-sm text-white/70">
            We {sent.channel === 'sms' ? 'texted' : 'emailed'} a 6-digit code to <strong className="whitespace-nowrap text-white">{sent.to}</strong>. Enter it below. It works for 10
            minutes.
          </p>
          {sent.channel === 'sms' && testNote}
          {/* The key makes a fresh box when the way changes, so the browser treats the two kinds of code apart. */}
          <Field
            key={sent.channel}
            label={sent.channel === 'sms' ? 'Code from your text message' : 'Code from your email'}
            name="code"
            required
            inputMode="numeric"
            autoComplete={sent.channel === 'sms' ? 'one-time-code' : 'off'}
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="tabular text-center text-lg tracking-[0.4em]"
          />
          <Problem text={error} />
          {notice && (
            <p role="status" className="text-sm text-white/70">
              {notice}
            </p>
          )}
          <Submit busy={busy} label="Create my account" busyLabel="Checking…" />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-sm">
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
            <button type="button" onClick={() => resend()} disabled={busy || wait > 0} className="font-medium hover:underline disabled:text-white/40 disabled:no-underline" style={wait > 0 ? undefined : { color: ACCENT }}>
              {wait > 0 ? `Send a new code in ${waitText(wait)}` : 'Send a new code'}
            </button>
            {channels[other(sent.channel)] && (
              <button type="button" onClick={() => resend(other(sent.channel))} disabled={busy || wait > 0} className="font-medium hover:underline disabled:text-white/40 disabled:no-underline" style={wait > 0 ? undefined : { color: ACCENT }}>
                {sent.channel === 'sms' ? 'Send it by email instead' : 'Send it by text instead'}
              </button>
            )}
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
