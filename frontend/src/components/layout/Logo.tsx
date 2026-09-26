import { cn } from '../../lib/cn'

/** The monogram on its own, sized by `className`. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#1f5fbf" />
      <path
        d="M9 20.5c0 2 2.2 3.5 6.5 3.5 4.6 0 7.5-1.9 7.5-5 0-2.8-2.2-4-6.2-4.8-3-.6-4-1.1-4-2.2 0-1.2 1.3-1.9 3.4-1.9 2.2 0 3.5.8 3.7 2.3h2.8c-.2-3-2.7-4.9-6.5-4.9-4 0-6.4 1.9-6.4 4.7 0 2.7 2 3.9 5.8 4.6 3.2.6 4.4 1.2 4.4 2.4 0 1.3-1.5 2.1-4.1 2.1-2.6 0-4-.8-4.1-2.3z"
        fill="#fff"
      />
      <circle cx="24" cy="8" r="2.5" fill="#7dd3c0" />
    </svg>
  )
}

/** Sangyin AI wordmark with a simple monogram. */
export function Logo({ className, showSubtitle = true, inverted = false }: { className?: string; showSubtitle?: boolean; inverted?: boolean }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <LogoMark className="size-9" />
      <div className="min-w-0 leading-tight">
        <p className={cn('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-ink')}>Sangyin AI</p>
        {showSubtitle && (
          <p className={cn('truncate text-[11px]', inverted ? 'text-white/70' : 'text-ink-3')}>AI-Guided Adaptive Education System</p>
        )}
      </div>
    </div>
  )
}
