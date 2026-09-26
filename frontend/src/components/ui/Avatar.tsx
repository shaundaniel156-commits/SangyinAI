import { cn } from '../../lib/cn'

const PALETTE = [
  'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200',
  'bg-accent-100 text-accent-700 dark:bg-[#10302a] dark:text-[#7fd9c4]',
  'bg-[#fdecd9] text-[#8a4a12] dark:bg-[#3a2616] dark:text-[#f3c08a]',
  'bg-[#ece8fb] text-[#4a3aa7] dark:bg-[#27224a] dark:text-[#b9b0f2]',
]

interface AvatarProps {
  initials: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ initials, size = 'md', className }: AvatarProps) {
  const hash = initials.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold',
        PALETTE[hash % PALETTE.length],
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-10 text-sm',
        size === 'lg' && 'size-14 text-lg',
        className,
      )}
    >
      {initials}
    </span>
  )
}
