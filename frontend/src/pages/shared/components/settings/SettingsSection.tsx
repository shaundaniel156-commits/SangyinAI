import { Save } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardHeader } from '../../../../components/ui/Card'

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  /** The Save button's label; false for a section with nothing to save. */
  saveLabel?: string | false
  /** What Save does. A section without it shows no Save button. */
  onSave?: () => Promise<void> | void
}

/** Card wrapper for one settings section, with a Save button when there is something to save. */
export function SettingsSection({ title, description, children, saveLabel = 'Save changes', onSave }: SettingsSectionProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (onSave) void onSave()
  }
  return (
    <Card>
      <form onSubmit={submit}>
        <CardHeader title={title} description={description} />
        <div className="p-5">{children}</div>
        {saveLabel && onSave && (
          <div className="flex justify-end border-t border-line px-5 py-4">
            <Button type="submit" icon={<Save className="size-4" aria-hidden />}>
              {saveLabel}
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}
