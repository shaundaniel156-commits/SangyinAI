import { Loader2, MessageSquarePlus, SendHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSession } from '../../context/SessionContext'
import { API_URL, apiHeaders } from '../../lib/api'
import { cn } from '../../lib/cn'
import { readStorage, writeStorage } from '../../lib/storage'

/** One turn in the conversation. The AI's turn is "streaming" while its reply is still arriving. */
interface Turn {
  id: number
  role: 'user' | 'ai'
  text: string
  streaming?: boolean
}

const SUGGESTIONS = [
  'Explain long division to a Primary 4 class in simple steps, with two examples.',
  'Plan a 40-minute lesson on photosynthesis for Senior 2 with a quick check at the end.',
  'Write a short note to parents about a learner who is behind in reading, and how they can help at home.',
  'Give me five word problems about money in shillings for Primary 6, with answers.',
  'How do I use Analyse exam results and the AI Assessment Builder together?',
]

const STORAGE_PREFIX = 'sangyin.askAi.'

function load(key: string): Turn[] {
  try {
    const raw = readStorage(key)
    const turns = raw ? (JSON.parse(raw) as Turn[]) : []
    // A reply cut off by a page reload is kept as far as it got.
    return turns.map((t) => ({ ...t, streaming: false })).filter((t) => t.text)
  } catch {
    return []
  }
}

/**
 * Ask the AI: an open conversation with the AI about teaching, learners and the app. The reply streams in
 * as the AI writes it. The conversation stays in this browser (per account); nothing is kept on the server.
 */
export function AskAiPage() {
  const { user } = useSession()
  const storageKey = `${STORAGE_PREFIX}${user.id}`
  const [turns, setTurns] = useState<Turn[]>(() => load(storageKey))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    writeStorage(storageKey, turns.length ? JSON.stringify(turns.slice(-40)) : null)
  }, [turns, storageKey])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  const ask = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    setDraft('')
    setBusy(true)
    const history = [...turns, { id: Date.now(), role: 'user' as const, text: question }]
    const aiId = Date.now() + 1
    setTurns([...history, { id: aiId, role: 'ai', text: '', streaming: true }])
    const append = (piece: string) => setTurns((list) => list.map((t) => (t.id === aiId ? { ...t, text: t.text + piece } : t)))

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ messages: history.slice(-30).map(({ role, text }) => ({ role, text })) }),
      })
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        append(body.message ?? body.error ?? `The server replied ${res.status}. Please try again.`)
      } else {
        // The reply arrives in pieces as the AI writes it.
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          append(decoder.decode(value, { stream: true }))
        }
      }
    } catch {
      append('I can’t reach the Sangyin server. Check your connection and try again.')
    } finally {
      setTurns((list) => list.map((t) => (t.id === aiId ? { ...t, streaming: false } : t)))
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void ask(draft)
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter makes a new line.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void ask(draft)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <PageHeader
        title="Ask the AI"
        description="Ask anything about teaching, your learners or the app — explain a topic, plan a lesson, write questions or a note to parents."
        actions={
          turns.length > 0 && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setTurns([])} icon={<MessageSquarePlus className="size-4" aria-hidden />}>
              New chat
            </Button>
          )
        }
      />

      <div className="flex-1 space-y-8 pb-8">
        {turns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-6">
            <p className="text-sm font-medium text-ink">Try asking</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => void ask(s)}
                    className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-left text-sm text-ink-2 transition-colors hover:border-brand-500 hover:text-ink"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          turns.map((t) =>
            t.role === 'user' ? (
              <div key={t.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-line rounded-2xl bg-surface-2 px-5 py-3 text-[15px] leading-relaxed text-ink">{t.text}</p>
              </div>
            ) : (
              <div key={t.id} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  {t.streaming && !t.text ? (
                    <p className="flex items-center gap-2 text-sm text-ink-3" role="status" aria-live="polite">
                      <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden />
                      Thinking…
                    </p>
                  ) : (
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">
                      {t.text}
                      {t.streaming && (
                        <span className="animate-pulse text-brand-600" aria-hidden>
                          ▍
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ),
          )
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-4 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={Math.min(6, Math.max(1, draft.split('\n').length))}
          placeholder="Ask the AI anything… (Enter to send, Shift+Enter for a new line)"
          aria-label="Your message to the AI"
          className={cn('block w-full resize-none bg-transparent px-3 py-2 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none')}
        />
        <Button type="submit" disabled={busy || !draft.trim()} icon={<SendHorizontal className="size-4" aria-hidden />}>
          Send
        </Button>
      </form>
      <p className="mt-3 text-center text-xs text-ink-3">The AI can make mistakes — check anything you will use with learners. This conversation is kept only in this browser.</p>
    </div>
  )
}
