import { MessageSquarePlus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatComposer, ChatThread, useAiChat } from '../../components/domain/AiChat'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { useLiveData } from '../../context/LiveDataContext'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatShortDate } from '../../lib/format'
import { readStorage, writeStorage } from '../../lib/storage'
import type { Role } from '../../types'

// What the page says, and the questions it suggests, for whoever is signed in. The AI is told who is asking too
// (backend ai/chat.ts): a teaching assistant for staff, a tutor for a student, home-support help for a parent.
const FOR_ROLE: Record<Role, { description: string; suggestions: string[] }> = {
  teacher: {
    description: 'Ask anything about teaching, your learners or the app — explain a topic, plan a lesson, write questions or a note to parents.',
    suggestions: [
      'Explain long division to a Primary 4 class in simple steps, with two examples.',
      'Plan a 40-minute lesson on photosynthesis for Senior 2 with a quick check at the end.',
      'Write a short note to parents about a learner who is behind in reading, and how they can help at home.',
      'Give me five word problems about money in shillings for Primary 6, with answers.',
      'How do I use Analyse exam results and the AI Assessment Builder together?',
    ],
  },
  admin: {
    description: 'Ask anything about running the school in Sangyin, supporting your teachers, or teaching and learning.',
    suggestions: [
      'How do I add a new teacher and give them a class?',
      'What should I look at each week to see which classes need help?',
      'Write a short message to parents explaining how to use Sangyin to follow their child’s progress.',
      'How can teachers use Analyse exam results and AI Guidance after end-of-term exams?',
      'Suggest a simple plan for a class that is behind in reading.',
    ],
  },
  student: {
    description: 'Your study helper. Ask about anything you are learning: it explains step by step and helps you work things out yourself.',
    suggestions: [
      'Explain fractions to me with an example.',
      'I don’t understand ratio. Can you show me step by step?',
      'Give me three practice questions on what I find hard, one at a time.',
      'How do I write a good composition?',
      'Help me make a plan to revise for my exams.',
    ],
  },
  parent: {
    description: 'Ask how to help your child learn at home: what a topic means, what to practise, and how to encourage them.',
    suggestions: [
      'What can I do at home in 10 minutes a day to help my child with maths?',
      'My child says they hate reading. How can I help?',
      'Explain what my child is working on in simple words.',
      'What should I ask the teacher at the next parents’ meeting?',
      'How do I help my child when they are stuck on homework, without doing it for them?',
    ],
  },
}

/** A saved conversation, as listed under "Recent chats" (backend GET /ai/chats). */
interface ChatSummary {
  id: string
  title: string
  updatedOn: string
}
type Message = { role: 'user' | 'ai'; text: string }

// The id a conversation is saved under, made here when it starts.
const newId = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)

/** A conversation's title: its first question, shortened. */
function titleOf(messages: Message[]): string {
  const first = (messages.find((m) => m.role === 'user')?.text ?? 'Conversation').replace(/\s+/g, ' ').trim()
  return first.length > 70 ? `${first.slice(0, 67)}…` : first
}

/** "14:05" for today, otherwise the date. */
function when(iso: string): string {
  const date = new Date(iso)
  return date.toDateString() === new Date().toDateString() ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date) : formatShortDate(iso)
}

/**
 * Ask Sangyin AI, for every signed-in user: an open conversation with the AI. The reply streams in
 * as the AI writes it. Each conversation is saved to the user's account once the AI has answered, and listed
 * under "Recent chats" to reopen and carry on, on any device.
 */
export function AskAiPage() {
  const { user, role } = useSession()
  const { description, suggestions } = FOR_ROLE[role]
  const { live } = useLiveData()
  const { notify } = useToast()
  const [chats, setChats] = useState<ChatSummary[]>([])
  // The conversation on screen: a new one until a saved one is opened.
  const [currentId, setCurrentId] = useState(newId)
  const [opening, setOpening] = useState<string | null>(null)
  // Read when a reply finishes, so it is saved under the conversation it belongs to.
  const current = useRef(currentId)
  useEffect(() => {
    current.current = currentId
  }, [currentId])

  const save = useCallback(
    async (id: string, messages: Message[]) => {
      if (!live) return
      try {
        const saved = await api<ChatSummary>(`/ai/chats/${id}`, { method: 'PUT', body: { title: titleOf(messages), messages: messages.slice(-80) } })
        setChats((list) => [saved, ...list.filter((c) => c.id !== saved.id)])
      } catch (error) {
        console.warn('The conversation could not be saved.', error)
      }
    },
    [live],
  )

  // Without the server (no sign-in), the one conversation is kept in this browser instead.
  const localKey = `sangyin.askAi.${user.id}`
  const chat = useAiChat({ storageKey: live ? undefined : localKey, onReply: (turns) => void save(current.current, turns) })

  // The saved conversations. A conversation the earlier version of this page kept in this browser is saved first.
  useEffect(() => {
    if (!live) return
    let cancelled = false
    void (async () => {
      try {
        const raw = readStorage(localKey)
        const old = (raw ? (JSON.parse(raw) as Message[]) : []).filter((m) => m.text?.trim()).map(({ role, text }) => ({ role, text }))
        if (old.length) {
          await api(`/ai/chats/${newId()}`, { method: 'PUT', body: { title: titleOf(old), messages: old.slice(-80) } })
          writeStorage(localKey, null)
        }
      } catch {
        // Not worth stopping for: the list below still loads.
      }
      try {
        const list = await api<ChatSummary[]>('/ai/chats')
        if (!cancelled) setChats(list)
      } catch (error) {
        console.warn('The saved conversations could not be loaded.', error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [live, localKey])

  const startNew = () => {
    chat.reset()
    setCurrentId(newId())
  }

  const open = async (id: string) => {
    if (chat.busy || id === currentId) return
    setOpening(id)
    try {
      const saved = await api<{ messages: Message[] }>(`/ai/chats/${id}`)
      chat.reset(saved.messages.map((m, i) => ({ id: i + 1, role: m.role, text: m.text })))
      setCurrentId(id)
    } catch (error) {
      notify('That conversation could not be opened', { tone: 'info', description: (error as Error).message })
    } finally {
      setOpening(null)
    }
  }

  const remove = async (c: ChatSummary) => {
    if (!window.confirm(`Delete “${c.title}”?`)) return
    try {
      await api(`/ai/chats/${c.id}`, { method: 'DELETE' })
      setChats((list) => list.filter((x) => x.id !== c.id))
      if (c.id === currentId) startNew()
    } catch (error) {
      notify('Not deleted', { tone: 'info', description: (error as Error).message })
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Button className="w-full" disabled={chat.busy} onClick={startNew} icon={<MessageSquarePlus className="size-4" aria-hidden />}>
          New chat
        </Button>
        <h2 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-ink-3">Recent chats</h2>
        {chats.length === 0 ? (
          <p className="text-sm text-ink-3">{live ? 'Your conversations are saved here, so you can come back to them.' : 'Sign in to keep your conversations.'}</p>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-y-auto lg:max-h-[62vh]">
            {chats.map((c) => (
              <li key={c.id} className={cn('flex items-center gap-1 rounded-lg', c.id === currentId ? 'bg-brand-soft' : 'hover:bg-surface-2')}>
                <button type="button" onClick={() => void open(c.id)} disabled={chat.busy} className="min-w-0 flex-1 px-3 py-2 text-left disabled:opacity-60">
                  <span className={cn('block truncate text-sm', c.id === currentId ? 'font-medium text-brand-ink' : 'text-ink')}>{c.title}</span>
                  <span className="block text-xs text-ink-3">{opening === c.id ? 'Opening…' : when(c.updatedOn)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void remove(c)}
                  disabled={chat.busy}
                  aria-label={`Delete ${c.title}`}
                  title="Delete"
                  className="mr-1 shrink-0 rounded p-1.5 text-ink-3 transition-colors hover:bg-surface-3 hover:text-bad-ink disabled:opacity-60"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="flex min-h-[calc(100vh-8rem)] min-w-0 flex-col">
        <PageHeader
          title="Ask Sangyin AI"
          description={description}
        />

        <ChatThread
          turns={chat.turns}
          onRetry={() => void chat.retry()}
          className="flex-1 space-y-8 pb-8"
          empty={
            <div className="rounded-2xl border border-dashed border-line px-5 py-6">
              <p className="text-sm font-medium text-ink">Try asking</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void chat.send(s)}
                      className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-left text-sm text-ink-2 transition-colors hover:border-brand-500 hover:text-ink"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          }
        />

        <ChatComposer
          multiline
          busy={chat.busy}
          onSend={(text) => void chat.send(text)}
          placeholder="Ask Sangyin AI anything… (Enter to send, Shift+Enter for a new line)"
          // On a phone, students and parents have a tab bar along the bottom: the box sits above it.
          className={cn('sticky rounded-2xl border border-line bg-surface p-2 shadow-lg', role === 'student' || role === 'parent' ? 'bottom-20 lg:bottom-4' : 'bottom-4')}
        />
        <p className="mt-3 text-center text-xs text-ink-3">
          {role === 'student' ? 'The AI can make mistakes. If something does not look right, ask your teacher.' : role === 'parent' ? 'The AI can make mistakes. For anything important, check with your child’s teacher.' : 'The AI can make mistakes — check anything you will use with learners.'}{' '}
          {live ? 'Your conversations are saved to your account.' : 'This conversation is kept only in this browser.'}
        </p>
      </div>
    </div>
  )
}
