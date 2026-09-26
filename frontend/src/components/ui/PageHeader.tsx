import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import heroImage from '../../assets/dashboard-ai-bulb.jpg'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  meta?: ReactNode
  /** Full-width photo banner (used on dashboards). */
  hero?: boolean
  /** Hero only: content under the headline, e.g. a summary row or child picker. */
  children?: ReactNode
}

export function PageHeader({ title, description, actions, back, meta, hero = false, children }: PageHeaderProps) {
  if (hero)
    return (
      <HeroHeader title={title} description={description} actions={actions} meta={meta}>
        {children}
      </HeroHeader>
    )
  return (
    <header className="animate-rise mb-8 lg:mb-10">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-2">{description}</p>}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

/**
 * Edge-to-edge dashboard hero. The AI image is screen-blended and masked to a soft oval so it
 * reads as light in the background rather than a rectangle; the whole backdrop fades out at the
 * bottom into the page. Breaks out of <main>'s padding.
 */
function HeroHeader({ title, description, actions, meta, children }: Omit<PageHeaderProps, 'back' | 'hero'>) {
  return (
    <header className="relative isolate -mt-8 mb-4 mx-[calc(50%-50vw)] overflow-hidden lg:-mt-12">
      <div className="pointer-events-none absolute inset-0 -z-10 mask-[linear-gradient(to_bottom,black_55%,transparent)]" aria-hidden>
        <div className="absolute inset-0 bg-linear-to-br from-[#0a1633] via-[#07102a] to-transparent" />
        <img
          src={heroImage}
          alt=""
          className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-80 mix-blend-screen mask-[radial-gradient(ellipse_62%_85%_at_65%_42%,black_30%,transparent_72%)] md:w-3/4"
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#060b18] via-[#060b18]/70 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pb-10 lg:pt-16">
        <div className="animate-rise max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.6rem]">{title}</h1>
          {description && <p className="mt-3 text-base leading-relaxed text-white/75 sm:text-lg">{description}</p>}
          {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
          {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  )
}
