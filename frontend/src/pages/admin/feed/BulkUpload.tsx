import { Download, FileSpreadsheet, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { useToast } from '../../../context/ToastContext'
import { api } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import { FeedResults } from './FeedResults'
import { downloadFromApi, type CommitResult, type FeedKindInfo, type PreviewResult } from './feedApi'

/** Spreadsheet upload: download the template, choose a CSV/Excel file, check every row, then save the good ones. */
export function BulkUpload({ kind, onSaved }: { kind: FeedKindInfo; onSaved?: () => void }) {
  const { notify } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [busy, setBusy] = useState(false)

  const check = async (f: File) => {
    setFile(f)
    setPreview(null)
    setResult(null)
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', f, f.name)
      setPreview(await api<PreviewResult>(`/feed/${kind.key}/preview`, { form }))
    } catch (error) {
      notify('The file could not be read', { tone: 'info', description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!preview) return
    setBusy(true)
    try {
      const saved = await api<CommitResult>(`/feed/${kind.key}/commit`, { body: { rows: preview.rows.filter((r) => !r.problems.length).map((r) => r.values) } })
      setResult(saved)
      setPreview(null)
      setFile(null)
      notify(`${kind.label}: saved`, { description: saved.notes.join(' ') })
      onSaved?.()
    } catch (error) {
      notify('Nothing saved', { tone: 'info', description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  // The first few columns that have values, to keep the review table readable.
  const shown = preview ? preview.columns.filter((c) => preview.rows.some((r) => r.values[c.key])).slice(0, 4) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="size-4" aria-hidden />}
          onClick={() => downloadFromApi(`/feed/${kind.key}/template`, `sangyin-${kind.key}-template.csv`).catch((e: Error) => notify('Template not downloaded', { tone: 'info', description: e.message }))}
        >
          Download template
        </Button>
        <Button size="sm" icon={<UploadCloud className="size-4" aria-hidden />} onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy && !preview ? 'Reading…' : 'Choose CSV or Excel file'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="sr-only"
          tabIndex={-1}
          aria-label={`Choose a ${kind.label} file`}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void check(f)
            e.target.value = ''
          }}
        />
        {file && (
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
            <FileSpreadsheet className="size-4 text-good" aria-hidden />
            {file.name}
          </span>
        )}
      </div>
      <p className="text-xs text-ink-3">Fill in the template (one row per item) in Excel or Google Sheets, save it, and choose it here. You will see every row checked before anything is saved.</p>

      {preview && (
        <div className="space-y-3">
          <p className="text-sm text-ink">
            <span className="font-medium text-good-ink">{preview.ready} ready</span> · <span className={cn(preview.problems ? 'font-medium text-bad-ink' : 'text-ink-3')}>{preview.problems} to fix</span>
          </p>
          <div className="max-h-80 overflow-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-medium">Row</th>
                  {shown.map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium">
                      {c.header}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((r) => (
                  <tr key={r.row}>
                    <td className="tabular px-3 py-2 text-ink-3">{r.row}</td>
                    {shown.map((c) => (
                      <td key={c.key} className="max-w-[14rem] truncate px-3 py-2 text-ink">
                        {r.values[c.key] || '—'}
                      </td>
                    ))}
                    <td className={cn('px-3 py-2', r.problems.length ? 'text-bad-ink' : 'text-good-ink')}>{r.problems.length ? r.problems.join('; ') : 'Ready'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy || preview.ready === 0}>
              {busy ? 'Saving…' : `Save ${preview.ready} row${preview.ready === 1 ? '' : 's'}`}
            </Button>
            <Button variant="secondary" onClick={() => { setPreview(null); setFile(null) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {result && <FeedResults result={result} onDismiss={() => setResult(null)} />}
    </div>
  )
}
