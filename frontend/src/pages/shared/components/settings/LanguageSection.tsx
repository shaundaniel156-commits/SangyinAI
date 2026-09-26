import { CheckCircle2 } from 'lucide-react'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { cn } from '../../../../lib/cn'
import { SettingsSection } from './SettingsSection'

/** English is available now; local languages such as Luganda are planned. */
const LANGUAGES = [
  { id: 'en', label: 'English', available: true },
  { id: 'lg', label: 'Luganda', available: false },
]

export function LanguageSection() {
  return (
    <SettingsSection title="Language" description="The language used across the app." saveLabel={false}>
      <fieldset>
        <legend className="sr-only">Display language</legend>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {LANGUAGES.map((l) => (
            <li key={l.id}>
              <label className={cn('flex items-center justify-between gap-3 px-4 py-3', l.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-70')}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="language" value={l.id} defaultChecked={l.id === 'en'} disabled={!l.available} className="size-4 accent-brand-600" />
                  <span className="text-sm font-medium text-ink">{l.label}</span>
                </span>
                {l.available ? (
                  <StatusBadge tone="good" icon={CheckCircle2}>Active</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Planned</StatusBadge>
                )}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <p className="mt-3 text-sm text-ink-3">More local languages are planned for later releases.</p>
    </SettingsSection>
  )
}
