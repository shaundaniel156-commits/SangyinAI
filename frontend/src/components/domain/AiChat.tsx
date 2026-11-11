import { Loader2, RefreshCw, SendHorizontal, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { API_URL, apiHeaders } from '../../lib/api'
import type { AiDraft } from '../../lib/aiAssessment'
import { cn } from '../../lib/cn'
import { readStorage, writeStorage } from '../../lib/storage'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'

/**
 * A conversation with the AI: the hook keeps the turns and streams replies from the server; ChatThread shows
 * them; ChatComposer is the box to type in. Used by Ask Sangyin AI and by the AI Assessment Builder's panel.
 */

export interface ChatTurn {
  id: number
  role: 'user' | 'ai'
  text: string
  /** AI turns: the reply is still arriving. */
  streaming?: boolean
  /** AI turns: what the AI is doing while there is no text yet ("Reading your report data…"). */
  status?: string
  /** AI turns in the assessment builder: the assessment it drafted, attached to the reply. */
  draft?: AiDraft
  /** AI turns in the assessment builder: the attempt failed and can be tried again. */
  retry?: boolean
  /** AI turns: no answer came (the AI was empty, busy or unreachable). The text is a note to the user, not an answer: it is never sent back as history or saved. */
  failed?: boolean
}

interface Options {
  /** Keeps the conversation in this browser under this key (text only). */
  storageKey?: string
  /** Where the user is and what they are doing, for the AI to take into account (sent with each message). */
  context?: () => string
  /** Called when the AI has finished a reply, with the conversation so far (for a page that saves it). */
  onReply?: (turns: { role: 'user' | 'ai'; text: string }[]) => void
}

let seq = 0
const nextId = () => Date.now() * 100 + (seq++ % 100)

function load(key: string): ChatTurn[] {
  try {
    const raw = readStorage(key)
    const turns = raw ? (JSON.parse(raw) as ChatTurn[]) : []
    // A reply cut off by a page reload is kept as far as it got. Empty turns and failed ones are dropped.
    return turns.filter((t) => t.text?.trim() && !t.failed).map((t) => ({ ...t, streaming: false }))
  } catch {
    return []
  }
}

export function useAiChat({ storageKey, context, onReply }: Options = {}) {
  const [turns, setTurns] = useState<ChatTurn[]>(() => (storageKey ? load(storageKey) : []))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!storageKey) return
    const kept = turns
      .filter((t) => !t.failed)
      .slice(-40)
      .map(({ id, role, text }) => ({ id, role, text }))
    writeStorage(storageKey, kept.length ? JSON.stringify(kept) : null)
  }, [turns, storageKey])

  const push = useCallback((turn: Omit<ChatTurn, 'id'>): number => {
    const id = nextId()
    setTurns((list) => [...list, { ...turn, id }])
    return id
  }, [])
  const update = useCallback((id: number, patch: Partial<ChatTurn>) => {
    setTurns((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])
  const append = useCallback((id: number, piece: string) => {
    setTurns((list) => list.map((t) => (t.id === id ? { ...t, text: t.text + piece } : t)))
  }, [])
  /** Clears the conversation, or replaces it with a saved one. */
  const reset = useCallback((to?: ChatTurn[]) => setTurns(Array.isArray(to) ? to : []), [])

  /** Shows text a few characters at a time, like someone typing (for replies made locally, not streamed). */
  const typeOut = useCallback(
    (id: number, text: string) =>
      new Promise<void>((resolve) => {
        let at = 0
        const tick = window.setInterval(() => {
          const next = Math.min(text.length, at + 4)
          append(id, text.slice(at, next))
          at = next
          if (at >= text.length) {
            window.clearInterval(tick)
            resolve()
          }
        }, 16)
      }),
    [append],
  )

  /** Asks the question after the turns given, and streams the AI's reply into a new turn. */
  const ask = useCallback(
    async (before: ChatTurn[], question: string) => {
      setBusy(true)
      // Only real turns go to the AI: a failed turn's note, or a reply that never came, would be refused or mislead it.
      const history = [...before.filter((t) => t.text.trim() && !t.failed), { id: nextId(), role: 'user' as const, text: question }]
      const aiId = nextId()
      setTurns([...before, history[history.length - 1]!, { id: aiId, role: 'ai', text: '', streaming: true }])
      // The reply as it arrives, kept here too so the finished conversation can be handed to onReply.
      let reply = ''
      // A note instead of an answer: shown with a Try again button, and never kept as part of the conversation.
      let failed: string | undefined
      try {
        const res = await fetch(`${API_URL}/ai/chat`, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({
            messages: history.slice(-30).map(({ role, text }) => ({ role, text })),
            ...(context ? { context: context() } : {}),
          }),
        })
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
          failed = body.message ?? body.error ?? `The server replied ${res.status}. Please try again.`
        } else {
          // The reply arrives in pieces as the AI writes it.
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            const piece = decoder.decode(value, { stream: true })
            reply += piece
            append(aiId, piece)
          }
          if (!reply.trim()) failed = 'The AI did not answer. Please try again.'
        }
      } catch {
        failed = 'I can’t reach the Sangyin server. Check your connection and try again.'
      } finally {
        update(aiId, failed ? { streaming: false, failed: true, text: failed } : { streaming: false })
        setBusy(false)
        if (!failed) onReply?.([...history.map(({ role, text }) => ({ role, text })), { role: 'ai', text: reply }])
      }
    },
    [context, onReply, append, update],
  )

  /** Sends the user's message and streams the AI's reply into a new turn. */
  const send = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || busy) return
      await ask(turns, question)
    },
    [turns, busy, ask],
  )

  /** Asks the last question again, when the AI gave no answer to it. */
  const retry = useCallback(async () => {
    const last = turns.at(-1)
    const asked = turns.at(-2)
    if (busy || !last?.failed || asked?.role !== 'user') return
    await ask(turns.slice(0, -2), asked.text)
  }, [turns, busy, ask])

  return { turns, busy, send, retry, push, update, append, typeOut, reset }
}

interface ChatThreadProps {
  turns: ChatTurn[]
  /** Shown when there are no turns yet. */
  empty: ReactNode
  /** Something to show under a finished AI turn (the drafted assessment, a Try again button). */
  attachment?: (turn: ChatTurn) => ReactNode
  /** Asks the last question again; shown as a Try again button when the AI gave no answer to it. */
  onRetry?: () => void
  /** Smaller type, for a side panel. */
  compact?: boolean
  className?: string
}

/** The turns of a conversation, newest at the bottom; scrolls itself to the newest as replies arrive. */
export function ChatThread({ turns, empty, attachment, onRetry, compact, className }: ChatThreadProps) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [turns])

  return (
    <div ref={listRef} data-keep={turns.length ? '' : undefined} className={cn('space-y-6 overflow-y-auto', className)}>
      {turns.length === 0
        ? empty
        : turns.map((t) =>
            t.role === 'user' ? (
              <div key={t.id} className="flex justify-end">
                <p className={cn('max-w-[88%] whitespace-pre-line rounded-2xl bg-surface-2 leading-relaxed text-ink', compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 text-[15px]')}>{t.text}</p>
              </div>
            ) : (
              <div key={t.id} className="flex gap-3">
                <span className={cn('mt-0.5 grid shrink-0 place-items-center rounded-full bg-brand-600 text-white', compact ? 'size-7' : 'size-8')}>
                  <Sparkles className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  {t.streaming && !t.text ? (
                    <p className="flex items-center gap-2 text-sm text-ink-3" role="status" aria-live="polite">
                      <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden />
                      {t.status ?? 'Thinking'}…
                    </p>
                  ) : (
                    <p className={cn('whitespace-pre-line leading-relaxed', t.failed ? 'text-ink-3' : 'text-ink', compact ? 'text-sm' : 'text-[15px]')} role={t.failed ? 'status' : undefined}>
                      {t.text}
                      {t.streaming && (
                        <span className="animate-pulse text-brand-600" aria-hidden>
                          ▍
                        </span>
                      )}
                    </p>
                  )}
                  {t.failed && onRetry && t === turns[turns.length - 1] && (
                    <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry} icon={<RefreshCw className="size-4" aria-hidden />}>
                      Try again
                    </Button>
                  )}
                  {!t.streaming && !t.failed && attachment?.(t)}
                </div>
              </div>
            ),
          )}
    </div>
  )
}

interface ChatComposerProps {
  onSend: (text: string) => void
  busy: boolean
  placeholder?: string
  /** A taller box: Enter sends, Shift+Enter makes a new line. */
  multiline?: boolean
  className?: string
}

/** The box to write to the AI. */
export function ChatComposer({ onSend, busy, placeholder = 'Ask Sangyin AI anything…', multiline, className }: ChatComposerProps) {
  const [draft, setDraft] = useState('')
  const send = () => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    onSend(text)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    send()
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }
  const field = 'block w-full resize-none bg-transparent px-3 py-2 text-ink placeholder:text-ink-3 focus:outline-none'
  return (
    <form onSubmit={submit} className={cn('flex items-end gap-2', className)}>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={Math.min(6, Math.max(1, draft.split('\n').length))}
          placeholder={busy ? 'The AI is working…' : placeholder}
          aria-label="Your message to the AI"
          className={cn(field, 'text-[15px]')}
        />
      ) : (
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={busy ? 'The AI is working…' : placeholder} aria-label="Your message to the AI" className={cn(field, 'h-10 text-sm')} />
      )}
      <Button type="submit" size={multiline ? 'md' : 'sm'} disabled={busy || !draft.trim()} icon={<SendHorizontal className="size-4" aria-hidden />}>
        Send
      </Button>
    </form>
  )
}

interface AssistantCardProps {
  chat: ReturnType<typeof useAiChat>
  /** The page is also waiting on the AI for something else (drafting an assessment), so the box waits too. */
  busy?: boolean
  description: string
  /** Shown under "Ask me anything" before the first message: examples of what to ask on this page. */
  emptyHint: string
  attachment?: (turn: ChatTurn) => ReactNode
  className?: string
}

/** "Sangyin AI" as a card beside a page: the teacher asks anything, with the page's context sent along. */
export function AssistantCard({ chat, busy = false, description, emptyHint, attachment, className }: AssistantCardProps) {
  return (
    <Card className={cn('flex max-h-[calc(100vh-7rem)] min-h-[30rem] flex-col', className)}>
      <CardHeader title="Sangyin AI" description={description} icon={<Sparkles className="size-5" aria-hidden />} />
      <ChatThread
        turns={chat.turns}
        compact
        className="flex-1 px-5 py-5"
        attachment={attachment}
        onRetry={() => void chat.retry()}
        empty={
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand-ink">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-medium text-ink">Ask me anything</p>
            <p className="mt-1 max-w-xs text-xs text-ink-3">{emptyHint}</p>
          </div>
        }
      />
      <ChatComposer busy={busy || chat.busy} onSend={(text) => void chat.send(text)} placeholder="Ask Sangyin AI anything…" className="border-t border-line p-3" />
      <p className="px-4 pb-3 text-center text-xs text-ink-3">The AI can make mistakes. Check anything you will use with learners.</p>
    </Card>
  )
}
