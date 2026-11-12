import { SettingsSection } from './SettingsSection'

/** English only for now: there is no translation to choose, so nothing here to set. */
export function LanguageSection() {
  return (
    <SettingsSection title="Language" description="The language used across the app." saveLabel={false}>
      <p className="text-sm text-ink-2">
        Sangyin AI is in English for now. Other languages, such as Luganda, are not available yet. When they are, you will choose one here.
      </p>
    </SettingsSection>
  )
}
