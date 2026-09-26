import { Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import { inputClasses } from './Field'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search…', label = 'Search', className }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(inputClasses, 'h-10 pl-9')}
      />
    </div>
  )
}
