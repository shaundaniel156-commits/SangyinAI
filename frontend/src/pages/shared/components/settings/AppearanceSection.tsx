import { Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardHeader } from '../../../../components/ui/Card'
import { useTheme, type ThemePreference } from '../../../../context/ThemeContext'
import { cn } from '../../../../lib/cn'

const OPTIONS: { id: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', description: 'Bright background', icon: Sun },
  { id: 'dark', label: 'Dark', description: 'Easier in low light', icon: Moon },
  { id: 'system', label: 'System', description: 'Match this device', icon: Monitor },
]

/** Theme choice applies immediately (frontend only). */
export function AppearanceSection() {
  const { preference, setPreference } = useTheme()
  return (
    <Card>
      <CardHeader title="Appearance" description="Choose how Sangyin AI looks on this device. Changes apply straight away." />
      <fieldset className="p-5">
        <legend className="sr-only">Theme</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPTIONS.map((o) => {
            const Icon = o.icon
            const active = preference === o.id
            return (
              <label
                key={o.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500',
                  active ? 'border-brand-500 bg-brand-soft' : 'border-line hover:bg-surface-2',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={o.id}
                  checked={active}
                  onChange={() => setPreference(o.id)}
                  className="sr-only"
                />
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', active ? 'bg-brand-600 text-white' : 'bg-surface-3 text-ink-2')}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{o.label}</span>
                  <span className="block text-sm text-ink-3">{o.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </Card>
  )
}
