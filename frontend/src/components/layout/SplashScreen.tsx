import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'
import { LogoMark } from './Logo'

const SHOW_MS = 1800
const FADE_MS = 900

/**
 * Full-screen intro shown once per page load. The app renders underneath,
 * so nothing waits on it; the overlay fades out and then unmounts.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'done'>('show')

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const show = reduced ? 600 : SHOW_MS
    const fade = setTimeout(() => setPhase('fade'), show)
    const done = setTimeout(() => setPhase('done'), show + FADE_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      role="status"
      aria-label="Loading Sangyin AI"
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
          <LogoMark className="relative size-20" />
        </div>
        <p className="mt-6 text-3xl font-bold tracking-tight text-[#5b93e6]">Sangyin AI</p>
        <p className="mt-1.5 text-sm text-white/60">AI-Guided Adaptive Education System</p>
      </div>
      </div>
    </div>
  )
}
