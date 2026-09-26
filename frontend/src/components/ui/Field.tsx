import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '../../lib/cn'

export const inputClasses =
  'block w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-surface-3 disabled:text-ink-3'

interface FieldWrapperProps {
  label: string
  hint?: ReactNode
  children: (id: string) => ReactNode
  className?: string
  hideLabel?: boolean
}

export function FieldWrapper({ label, hint, children, className, hideLabel }: FieldWrapperProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={cn('mb-1.5 block text-sm font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; hideLabel?: boolean }

export function TextField({ label, hint, className, hideLabel, ...rest }: TextFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint} className={className} hideLabel={hideLabel}>
      {(id) => <input id={id} className={cn(inputClasses, 'h-10')} {...rest} />}
    </FieldWrapper>
  )
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode }

export function TextArea({ label, hint, className, rows = 4, ...rest }: TextAreaProps) {
  return (
    <FieldWrapper label={label} hint={hint} className={className}>
      {(id) => <textarea id={id} rows={rows} className={cn(inputClasses, 'py-2')} {...rest} />}
    </FieldWrapper>
  )
}

export interface SelectOption {
  value: string
  label: string
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: SelectOption[]
  hint?: ReactNode
  hideLabel?: boolean
}

export function SelectField({ label, options, hint, className, hideLabel, ...rest }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint} className={className} hideLabel={hideLabel}>
      {(id) => (
        <select id={id} className={cn(inputClasses, 'h-10 pr-8')} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldWrapper>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-brand-600' : 'bg-line-strong',
        )}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}
