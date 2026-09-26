import { Save } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardHeader } from '../../../../components/ui/Card'
import { useToast } from '../../../../context/ToastContext'

export const SAVE_MESSAGE = 'Saved for preview — settings are not persisted in this prototype.'

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  /** Show a Save footer. The form submits to a preview-only toast. */
  saveLabel?: string | false
}

/** Card wrapper for one settings section with an optional preview-only save action. */
export function SettingsSection({ title, description, children, saveLabel = 'Save changes' }: SettingsSectionProps) {
  const { notify } = useToast()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    notify(`${title} saved`, { description: SAVE_MESSAGE })
  }
  return (
    <Card>
      <form onSubmit={submit}>
        <CardHeader title={title} description={description} />
        <div className="p-5">{children}</div>
        {saveLabel && (
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
