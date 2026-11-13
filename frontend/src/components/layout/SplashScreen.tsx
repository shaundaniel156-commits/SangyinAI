import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { LogoMark } from './Logo'

// Shown at least this long once it appears, so a quick load does not make it flash.
const MIN_MS = 400
const FADE_MS = 600

/**
 * Full-screen intro, shown while the school's data is loading after sign-in (LiveDataProvider). It stays up for
 * at least MIN_MS, then fades out and unmounts as soon as the data is in. Before sign-in it never shows.
 */
export function SplashScreen({ loading }: { loading: boolean }) {
  const [phase, setPhase] = useState<'show' | 'fade' | 'done'>(loading ? 'show' : 'done')
  // When the splash last appeared, so a quick load still shows it for MIN_MS.
  const shownAt = useRef(0)

  useEffect(() => {
    if (loading) {
      shownAt.current = Date.now()
      setPhase('show')
      return
    }
    // Loaded: keep it up to the minimum, then fade. Only a splash that is showing moves on; a finished one stays finished.
    const wait = Math.max(0, MIN_MS - (Date.now() - shownAt.current))
    const fade = setTimeout(() => setPhase((p) => (p === 'show' ? 'fade' : p)), wait)
    const done = setTimeout(() => setPhase((p) => (p === 'fade' ? 'done' : p)), wait + FADE_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [loading])

  if (phase === 'done') return null

  return (
    <div
      role="status"
      aria-label="Loading Sangezi Academia"
      className={cn(
        'fixed inset-0 z-100 flex flex-col items-center justify-center bg-black text-white transition-opacity ease-out',
        phase === 'fade' && 'pointer-events-none opacity-0',
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 45% 40% at 50% 45%, rgba(31,95,191,0.45), transparent 70%)' }}
        aria-hidden
      />

      {/* On fade, the content drifts up and softens while the overlay dissolves into the page */}
      <div
        className={cn(
          'relative transition-all ease-out motion-reduce:transition-none',
          phase === 'fade' && '-translate-y-3 scale-105 blur-sm',
        )}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
      <div className="splash-rise relative flex flex-col items-center">
        <div className="relative">
          <div className="splash-pulse absolute -inset-6 rounded-full bg-brand-600/50 blur-2xl" aria-hidden />
          <LogoMark className="relative size-20" onDark />
        </div>
        <p className="mt-6 text-3xl font-bold tracking-tight text-[#5b93e6]">Sangezi Academia</p>
        <p className="mt-1.5 text-sm text-white/60">Loading your school’s data…</p>
      </div>
      </div>
    </div>
  )
}
