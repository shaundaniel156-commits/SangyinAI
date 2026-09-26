import { Clock, HeartHandshake, MessageSquareText, Printer, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { PageHeader } from '../../components/ui/PageHeader'
import { formatDate } from '../../lib/format'
import { ChildSwitcher } from './components/ChildSwitcher'
import { getChildSummary } from './components/childSummary'
import { useSelectedChild } from './components/useSelectedChild'

export function ParentHomeSupportPage() {
  const { children, child, setChildId } = useSelectedChild()
  const summary = getChildSummary(child)
  const today = formatDate(new Date().toISOString())
  const tip = summary.tips[0]
  // Kept within a single 160-character SMS for low-cost delivery.
  const sms = `Sangyin AI: ${child.name} is working on ${summary.focus}.${tip ? ` Tip: ${tip.title}, about ${tip.minutes} min a day.` : ''} Reply STOP to opt out.`.slice(0, 160)

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Home Support"
          description="Short, simple ideas for helping your child at home. A few minutes a day is enough."
          actions={
            <>
              <ChildSwitcher childList={children} value={child.id} onChange={setChildId} />
              <Button variant="secondary" icon={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>
                Print take-home note
              </Button>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card as="article" className="print:border-0 print:shadow-none">
            <div className="border-b border-line px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Take-home note</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{child.name}</h2>
              <p className="text-sm text-ink-3">
                {summary.className} · {today}
              </p>
            </div>
            <CardBody className="space-y-5">
              <div>
                <p className="text-sm text-ink-3">Current Learning Focus</p>
                <p className="text-base font-semibold text-ink">{summary.focus}</p>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <HeartHandshake className="size-4 text-accent-600" aria-hidden />
                  How you can help
                </h3>
                <ol className="mt-3 space-y-3">
                  {summary.tips.map((t, i) => (
                    <li key={t.id} className="flex gap-3 rounded-lg border border-line p-3.5">
                      <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{t.title}</p>
                        <p className="mt-0.5 text-sm text-ink-2">{t.tip}</p>
                        <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-3">
                          <Clock className="size-3.5" aria-hidden />
                          About {t.minutes} minutes
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {summary.strengths.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Sparkles className="size-4 text-good" aria-hidden />
                    Something to praise
                  </h3>
                  <p className="mt-1 text-sm text-ink-2">
                    Your child is doing well in {summary.strengths.map((s) => s.name).join(', ')}. Let them know you noticed!
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="no-print space-y-4">
          <Card>
            <CardHeader title="Tips for short daily practice" />
            <CardBody>
              <ul className="list-disc space-y-2 pl-5 text-sm text-ink-2">
                <li>Keep it short — 5 to 10 minutes is plenty.</li>
                <li>Use everyday things like food, money or cups of water.</li>
                <li>Praise effort, not only right answers.</li>
                <li>Ask your child to explain how they worked it out.</li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="SMS summary"
              description="The same note as a short text, for phones without the app or data"
              icon={<MessageSquareText className="size-5" aria-hidden />}
            />
            <CardBody>
              <p className="rounded-2xl rounded-bl-sm bg-surface-3 px-4 py-3 text-sm text-ink">{sms}</p>
              <p className="tabular mt-2 text-xs text-ink-3">{sms.length} / 160 characters · one SMS</p>
            </CardBody>
          </Card>
          <DemoNotice>These are sample suggestions for this prototype. Printing uses your browser’s print option; SMS and USSD delivery are not connected.</DemoNotice>
        </div>
      </div>
    </>
  )
}
