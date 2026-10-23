import { Download, KeyRound } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { accountsCsv, saveBlob, type CommitResult } from './feedApi'

/** What a save did: notes, rows that were refused, and any new accounts with their one-time passwords. */
export function FeedResults({ result, onDismiss }: { result: CommitResult; onDismiss: () => void }) {
  return (
    <div role="status" className="space-y-3 rounded-xl border border-line bg-surface-2 p-4 text-sm">
      <ul className="space-y-1 text-ink">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      {result.rejected.length > 0 && (
        <div>
          <p className="font-medium text-bad-ink">{result.rejected.length} row{result.rejected.length === 1 ? ' was' : 's were'} not saved:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
            {result.rejected.slice(0, 20).map((r) => (
              <li key={r.row}>
                Row {r.row}: {r.problems.join('; ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.accounts && result.accounts.length > 0 && (
        <div className="rounded-lg border border-warn/40 bg-warn-soft p-3">
          <p className="flex items-center gap-2 font-medium text-warn-ink">
            <KeyRound className="size-4" aria-hidden />
            New accounts — one-time passwords
          </p>
          <p className="mt-1 text-xs text-warn-ink">
            Shown only now. Each person was also sent their details by email (and SMS if a phone was given) — check the Sent column. Give anyone not reached theirs privately; they change it in Settings after signing in.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-3">
                  <th className="py-1 pr-3 font-medium">Name</th>
                  <th className="py-1 pr-3 font-medium">Email</th>
                  <th className="py-1 pr-3 font-medium">Role</th>
                  <th className="py-1 pr-3 font-medium">One-time password</th>
                  <th className="py-1 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {result.accounts.map((a) => (
                  <tr key={a.email} className="border-t border-line/60">
                    <td className="py-1 pr-3 text-ink">{a.name}</td>
                    <td className="py-1 pr-3 text-ink">{a.email}</td>
                    <td className="py-1 pr-3 text-ink-2">{a.role}</td>
                    <td className="py-1 pr-3 font-mono text-ink">{a.tempPassword}</td>
                    <td className="py-1 text-ink-2" title={a.deliveryError}>
                      {a.emailSent === undefined ? '—' : [a.emailSent ? 'Email ✓' : 'Email ✗', a.smsSent === undefined ? null : a.smsSent ? 'SMS ✓' : 'SMS ✗'].filter(Boolean).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="secondary" className="mt-2" icon={<Download className="size-4" aria-hidden />} onClick={() => saveBlob(accountsCsv(result.accounts!), 'sangyin-new-accounts.csv')}>
            Download passwords (CSV)
          </Button>
        </div>
      )}
      <button type="button" onClick={onDismiss} className="text-xs font-medium text-brand-ink hover:underline">
        Dismiss
      </button>
    </div>
  )
}
