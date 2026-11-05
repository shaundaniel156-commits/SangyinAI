import { MessageSquarePlus } from 'lucide-react'
import { ChatComposer, ChatThread, useAiChat } from '../../components/domain/AiChat'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSession } from '../../context/SessionContext'

const SUGGESTIONS = [
  'Explain long division to a Primary 4 class in simple steps, with two examples.',
  'Plan a 40-minute lesson on photosynthesis for Senior 2 with a quick check at the end.',
  'Write a short note to parents about a learner who is behind in reading, and how they can help at home.',
  'Give me five word problems about money in shillings for Primary 6, with answers.',
  'How do I use Analyse exam results and the AI Assessment Builder together?',
]

/**
 * Ask the AI: an open conversation with the AI about teaching, learners and the app. The reply streams in
 * as the AI writes it. The conversation stays in this browser (per account); nothing is kept on the server.
 */
export function AskAiPage() {
  const { user } = useSession()
  const chat = useAiChat({ storageKey: `sangyin.askAi.${user.id}` })

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <PageHeader
        title="Ask the AI"
        description="Ask anything about teaching, your learners or the app — explain a topic, plan a lesson, write questions or a note to parents."
        actions={
          chat.turns.length > 0 && (
            <Button variant="secondary" size="sm" disabled={chat.busy} onClick={chat.reset} icon={<MessageSquarePlus className="size-4" aria-hidden />}>
              New chat
            </Button>
          )
        }
      />

      <ChatThread
        turns={chat.turns}
        className="flex-1 space-y-8 pb-8"
        empty={
          <div className="rounded-2xl border border-dashed border-line px-5 py-6">
            <p className="text-sm font-medium text-ink">Try asking</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
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
        placeholder="Ask the AI anything… (Enter to send, Shift+Enter for a new line)"
        className="sticky bottom-4 rounded-2xl border border-line bg-surface p-2 shadow-lg"
      />
      <p className="mt-3 text-center text-xs text-ink-3">The AI can make mistakes — check anything you will use with learners. This conversation is kept only in this browser.</p>
    </div>
  )
}
