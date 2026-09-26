import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-linear-to-r from-brand-600 to-sky-600 text-white shadow-[0_8px_22px_-10px_rgb(37_99_235/0.9)] hover:brightness-110 hover:shadow-[0_10px_28px_-10px_rgb(34_199_232/0.8)]',
  secondary: 'border border-line-strong bg-surface/60 text-ink backdrop-blur hover:border-brand-400/45 hover:bg-surface-3/80',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  danger: 'border border-bad/40 bg-surface/60 text-bad-ink hover:bg-bad-soft',
  success: 'bg-good text-white hover:brightness-110 shadow-sm',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
}

interface ButtonLinkProps {
  to: string
  variant?: Variant
  size?: Size
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function ButtonLink({ to, variant = 'primary', size = 'md', icon, className, children }: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}
