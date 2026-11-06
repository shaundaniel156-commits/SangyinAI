import { useId } from 'react'
import { cn } from '../../lib/cn'

// The Sangyin symbol: two brackets around a map of Africa drawn in stripes (public/svg/sangyin-symbol-full.svg),
// in the website's colours. They follow the theme: brand blue and teal on a light page; white, light blue and
// bright teal on a dark one.
const AFRICA =
  'M111.859 183.080L117.512 182.735L117.857 184.148L119.270 184.493L120.717 185.044L122.820 184.700L125.302 184.872L126.025 185.906L127.094 188.043L127.783 190.180L129.196 191.593L132.023 191.593L131.333 193.730L128.852 196.212L128.128 197.625L128.128 199.728L126.715 202.209L126.370 204.346L125.302 206.104L123.544 207.724L121.062 208.241L120.338 207.517L119.270 205.415L118.236 201.865L118.580 199.038L118.236 197.625L117.167 196.212L117.167 194.420L116.099 194.247L114.686 193.730L112.549 194.075L111.135 194.247L109.378 193.006L107.964 190.869L107.964 188.388L109.378 186.285L110.412 185.217L111.859 183.080'
const BRACKETS = ['M106.896 169.637L97.934 195.488L106.896 221.339', 'M133.091 169.637L142.053 195.488L133.091 221.339']

const ON_LIGHT = '[--logo-bracket:#1a4e9d] [--logo-outer:#1a9c80] [--logo-mid:#2f6ccc] [--logo-centre:#132f5b]'
const ON_DARK = '[--logo-bracket:#eaf0ff] [--logo-outer:#2fd0cc] [--logo-mid:#5287d8] [--logo-centre:#eaf0ff]'
const WITH_THEME = `${ON_LIGHT} dark:[--logo-bracket:#eaf0ff] dark:[--logo-outer:#2fd0cc] dark:[--logo-mid:#5287d8] dark:[--logo-centre:#eaf0ff]`

/** The symbol on its own, sized by `className`. `onDark`: always in its dark-background colours (the loading screen). */
export function LogoMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const clip = useId()
  return (
    <svg viewBox="93 165 54 61" className={cn('shrink-0', onDark ? ON_DARK : WITH_THEME, className)} aria-hidden>
      <clipPath id={clip}>
        <path d={AFRICA} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
          <rect key="107.620" x="107.620" y="161" width="1.379" height="69" fill="var(--logo-outer)" />
          <rect key="109.722" x="109.722" y="161" width="1.379" height="69" fill="var(--logo-outer)" />
          <rect key="111.859" x="111.859" y="161" width="1.379" height="69" fill="var(--logo-mid)" />
          <rect key="113.996" x="113.996" y="161" width="1.379" height="69" fill="var(--logo-mid)" />
          <rect key="116.099" x="116.099" y="161" width="1.379" height="69" fill="var(--logo-centre)" />
          <rect key="118.236" x="118.236" y="161" width="1.379" height="69" fill="var(--logo-centre)" />
          <rect key="120.373" x="120.373" y="161" width="1.379" height="69" fill="var(--logo-centre)" />
          <rect key="122.510" x="122.510" y="161" width="1.379" height="69" fill="var(--logo-mid)" />
          <rect key="124.612" x="124.612" y="161" width="1.379" height="69" fill="var(--logo-mid)" />
          <rect key="126.749" x="126.749" y="161" width="1.379" height="69" fill="var(--logo-outer)" />
          <rect key="128.886" x="128.886" y="161" width="1.379" height="69" fill="var(--logo-outer)" />
          <rect key="131.023" x="131.023" y="161" width="1.379" height="69" fill="var(--logo-outer)" />
      </g>
      {BRACKETS.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--logo-bracket)" strokeWidth="4.825" strokeMiterlimit="10" />
      ))}
    </svg>
  )
}

/** Sangyin AI wordmark with the symbol. */
export function Logo({ className, showSubtitle = true, inverted = false }: { className?: string; showSubtitle?: boolean; inverted?: boolean }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <LogoMark className="size-9" onDark={inverted} />
      <div className="min-w-0 leading-tight">
        <p className={cn('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-ink')}>Sangyin AI</p>
        {showSubtitle && (
          <p className={cn('truncate text-[11px]', inverted ? 'text-white/70' : 'text-ink-3')}>AI-Guided Adaptive Education System</p>
        )}
      </div>
    </div>
  )
}
