import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { SelectField, TextField } from '../../../components/ui/Field'
import { useToast } from '../../../context/ToastContext'
import { api } from '../../../lib/api'
import { FeedResults } from './FeedResults'
import { CHOICES, type CommitResult, type FeedKindInfo, type PreviewResult } from './feedApi'

/** Add one item by form. It goes through the same checks as a spreadsheet row. */
export function RowForm({ kind, onSaved, submitLabel = 'Add' }: { kind: FeedKindInfo; onSaved?: () => void; submitLabel?: string }) {
  const { notify } = useToast()
  const empty = () => Object.fromEntries(kind.columns.map((c) => [c.key, CHOICES[c.key]?.[0]?.value ?? '']))
  const [values, setValues] = useState<Record<string, string>>(empty)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [problems, setProblems] = useState<string[]>([])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setProblems([])
    try {
      // Check first, so the form can say exactly what is wrong; then save.
      const checked = await api<PreviewResult>(`/feed/${kind.key}/preview`, { body: { rows: [values] } })
      const found = checked.rows[0]?.problems ?? []
      if (found.length) {
        setProblems(found)
        return
      }
      const saved = await api<CommitResult>(`/feed/${kind.key}/commit`, { body: { rows: [values] } })
      setResult(saved.accounts?.length ? saved : null)
      notify(`${kind.label}: saved`, { description: saved.notes.join(' ') })
      setValues(empty())
      onSaved?.()
    } catch (error) {
      setProblems([(error as Error).message])
    } finally {
      setBusy(false)
    }
  }

  // Required fields first, then the rest.
  const columns = [...kind.columns].sort((a, b) => Number(!!b.required) - Number(!!a.required))
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {columns.map((c) =>
          CHOICES[c.key] ? (
            <SelectField
              key={c.key}
              label={c.header + (c.required ? ' *' : '')}
              value={values[c.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [c.key]: e.target.value }))}
              options={CHOICES[c.key]!}
              hint={c.help || undefined}
            />
          ) : (
            <TextField
              key={c.key}
              label={c.header + (c.required ? ' *' : '')}
              value={values[c.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [c.key]: e.target.value }))}
              placeholder={c.example}
              hint={c.help || undefined}
              required={c.required}
            />
          ),
        )}
      </div>
      {problems.length > 0 && (
        <ul role="alert" className="list-disc space-y-0.5 rounded-lg border border-bad/40 bg-bad-soft py-2 pl-8 pr-3 text-sm text-bad-ink">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <Button type="submit" disabled={busy} icon={<Plus className="size-4" aria-hidden />}>
        {busy ? 'Saving…' : submitLabel}
      </Button>
      {result && <FeedResults result={result} onDismiss={() => setResult(null)} />}
    </form>
  )
}
