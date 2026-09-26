import { ArrowRight, BookOpenCheck, Bot, Layers, MessageCircle, Stethoscope, TrendingUp, WifiOff, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ACCENT, AuthCanvas, AuthHeader, LOGO_BLUE, PhotoBackdrop } from './AuthChrome'

const HIGHLIGHTS = [
  { icon: Stethoscope, title: 'Diagnose', text: 'Competency-level diagnosis from student performance' },
  { icon: BookOpenCheck, title: 'Guide', text: 'Curriculum-aligned teaching guidance, reviewed by teachers' },
  { icon: WifiOff, title: 'Work offline', text: 'Designed for offline-first, low-bandwidth schools' },
]

const STATS = [
  { icon: TrendingUp, value: '2', label: 'Curricula Supported' },
  { icon: Zap, value: '4', label: 'Role Workspaces' },
  { icon: Bot, value: '24/7', label: 'AI Guidance' },
]

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#curricula', label: 'Curricula' },
]

/** Public landing page. Sign-in lives on its own page at /login. */
export function LandingPage() {
  return (
    <AuthCanvas>
      <AuthHeader>
        {NAV.map((n) => (
          <a key={n.href} href={n.href} className="hidden transition-colors hover:text-white sm:inline">
            {n.label}
          </a>
        ))}
        <Link to="/login" className="hidden transition-colors hover:text-white sm:inline">
          Sign in
        </Link>
        <Link
          to="/login"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: LOGO_BLUE }}
        >
          Get Started
        </Link>
      </AuthHeader>

      {/* Hero */}
      <section className="relative isolate flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-20 text-center">
        <PhotoBackdrop />
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium"
          style={{ color: ACCENT, borderColor: 'rgba(91,147,230,0.3)', backgroundColor: 'rgba(91,147,230,0.08)' }}
        >
          <Bot className="size-3.5" aria-hidden />
          AI-Guided Adaptive Education
        </span>

        <h1 className="mt-7 text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          Transform Your Classroom with
          <span className="mt-1 block" style={{ color: ACCENT }}>
            Intelligent Guidance
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          From competency-level diagnosis to curriculum-aligned teaching guidance. Help every learner grow with AI insights
          designed for everyday schools, reviewed by the teachers who know them.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: LOGO_BLUE }}
          >
            Sign in to your workspace
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: ACCENT, borderColor: ACCENT }}
          >
            <MessageCircle className="size-4" aria-hidden />
            See how it works
          </a>
        </div>

        <dl className="mt-12 grid grid-cols-3 gap-6 sm:gap-20">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <dt className="order-2 mt-1 text-xs text-white/70 sm:text-sm">{s.label}</dt>
              <dd className="order-1 flex items-center gap-1.5 text-2xl font-bold" style={{ color: ACCENT }}>
                <s.icon className="size-4" aria-hidden />
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Features */}
      <section id="features" className="relative scroll-mt-20 px-4 pb-20">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-xl border border-white/10 bg-white/3 p-5">
              <span className="grid size-9 place-items-center rounded-lg" style={{ color: ACCENT, backgroundColor: 'rgba(91,147,230,0.1)' }}>
                <h.icon className="size-4" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{h.title}</h3>
              <p className="mt-1 text-sm text-white/60">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer id="curricula" className="relative mt-auto border-t border-white/10 px-4 py-6">
        <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center text-sm text-white/50">
          <Layers className="size-4" aria-hidden />
          Uganda National Curriculum · Cambridge International Curriculum
        </p>
      </footer>
    </AuthCanvas>
  )
}
