import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useId, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { RevealButton } from '../../components/ui/Field'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { AuthCanvas, AuthHeader, LOGO_BLUE, PhotoBackdrop } from './AuthChrome'

/** Opened from the emailed reset link (/reset-password?token=…). Sets a new password; each link works once, for 30 minutes. */
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, newPassword: password } })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCanvas>
      <AuthHeader>
        <Link to="/login" className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
          <ArrowLeft className="size-4" aria-hidden />
          Back to sign in
        </Link>
      </AuthHeader>

      <main className="relative isolate flex flex-1 items-center justify-center px-4 py-12">
        <PhotoBackdrop />
        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#070b14]/85 p-6 shadow-2xl backdrop-blur sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
          {!token ? (
            <p className="mt-3 text-sm text-white/70">
              This page needs the link from your reset email. <Link to="/login" className="underline">Go back to sign in</Link> and choose “Forgot password?” to get one.
            </p>
          ) : done ? (
            <>
              <p className="mt-3 text-sm text-white/70">Your password has been changed. You can now sign in with it.</p>
              <Link
                to="/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: LOGO_BLUE }}
              >
                Sign in
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <DarkField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <DarkField label="Type it again" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
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
                {busy ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          )}
        </div>
      </main>
    </AuthCanvas>
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
