import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import heroImage from '../../assets/hero-ai-learner.jpg'

/*
 * Shared look for the public pages (landing + sign-in): black canvas, blue glow, logo-blue accents.
 * Colours are local on purpose — these pages keep the same look in light and dark theme.
 */
export const ACCENT = '#5b93e6' // logo blue, lightened for text on black
export const LOGO_BLUE = '#1f5fbf'

/** Full-page black canvas with the blue background glows. */
export function AuthCanvas({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-black text-white scheme-dark">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-x-0 top-0 h-225"
          style={{
            background:
              'radial-gradient(ellipse 55% 45% at 32% 18%, rgba(31,95,191,0.45), transparent 70%), radial-gradient(ellipse 70% 60% at 50% 30%, rgba(19,47,91,0.6), transparent 75%)',
          }}
        />
        <div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-brand-600/30 blur-3xl" />
      </div>
      {children}
    </div>
  )
}

/**
 * Hero photo toned to the logo blue and darkened in the centre so content on top stays readable.
 * Place inside a `relative isolate` container; it sits behind that container's content.
 */
export function PhotoBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#0a1a38]" />
      <img src={heroImage} alt="" className="absolute inset-0 size-full object-cover opacity-70 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-brand-600/25 mix-blend-color" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 50% 52%, rgba(0,0,0,0.72), rgba(0,0,0,0.35) 70%, transparent 100%), linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 25%, transparent 60%, #000)',
        }}
      />
    </div>
  )
}

/** Sticky top bar with the wordmark on the left and page-specific nav on the right. */
export function AuthHeader({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link to="/" className="text-lg font-bold tracking-tight" style={{ color: ACCENT }}>
          Sangyin AI
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/90">{children}</nav>
      </div>
    </header>
  )
}
