import { ApiError } from '@google/genai'
import { THINKING, getGemini, withBusyRetry } from './client.ts'
import { frameworkName } from './institution.ts'

// "Ask the AI": an open conversation with a teacher or admin about their teaching and the app.

export interface ChatTurn {
  role: 'user' | 'ai'
  text: string
}

export interface ChatContext {
  school: { name: string; type: string; framework: string }
  user: { name: string; role: string }
  /** Where the user is in the app and what they are doing right now, if the page says. */
  context?: string
}

const LEVEL_LABEL: Record<string, string> = { primary: 'a primary school', secondary: 'a secondary school', mixed: 'a primary and secondary school', university: 'a university' }

function systemPrompt({ school, user, context }: ChatContext): string {
  return `You are Sangyin AI, the teaching assistant inside the Sangyin AI app at ${school.name}, ${LEVEL_LABEL[school.type] ?? 'a school'} in Uganda following the ${frameworkName(school.framework)}. You are talking with ${user.name}, a ${user.role} there.

Help with anything about teaching and school life: explaining a topic at the right level, planning a lesson, writing questions or a marking scheme, feedback for a learner, a note to parents, how to catch up a learner who is behind, and how to use the app (Dashboard, Students, Classes, Assessments, Performance, Diagnostics, Analyse exam results, AI Guidance, AI Assessment Builder, Curriculum, Manual feed, Reports).

How to answer:
- Clear, simple English with Ugandan context (shillings, markets, school life, farming).
- Concrete and brief: short paragraphs, numbered steps for a method, examples with answers. No Markdown symbols such as **, # or backticks — plain text only.
- If you need one thing to answer well, ask one short question first.
- You do not have this school's student results in this conversation. Never invent marks or names; point to the Diagnostics, Performance and Analyse exam results pages instead.
- When you don't know, say so plainly.${context ? `

Where ${user.name} is right now: ${context.trim()}` : ''}`
}

/** The AI's reply, piece by piece as it writes it. Throws when the AI can't be reached (the caller tells the user). */
export async function* chatStream(messages: ChatTurn[], context: ChatContext): AsyncGenerator<string> {
  const contents = messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }))
  const config = { systemInstruction: systemPrompt(context) }
  const start = (model: string, thinking: boolean) => getGemini().models.generateContentStream({ model, contents, config: thinking ? { ...config, thinkingConfig: { thinkingLevel: THINKING } } : config })

  // withBusyRetry tries again when Google is busy, then the fallback models.
  const stream = await withBusyRetry('chat', async (model) => {
    try {
      return await start(model, true)
    } catch (error) {
      // A model that doesn't take this thinking level refuses the whole request: ask again without it.
      if (!(error instanceof ApiError) || error.status !== 400 || !/thinking/i.test(error.message)) throw error
      return start(model, false)
    }
  })
  for await (const chunk of stream) {
    const text = chunk.text
    if (text) yield text
  }
}
