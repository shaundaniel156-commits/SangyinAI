import { z } from 'zod'
import { aiConfigured, askGeminiForJson } from './client.ts'
import { logAiError } from './errors.ts'

// Marks photos of work students did on paper (written_work questions) against the model answer.

export interface WorkToMark {
  prompt: string
  /** The model answer with its marking points, as the teacher approved it. */
  answer: string
  explanation: string
  competency: string
  mimeType: string
  /** The photo, base64. */
  data: string
}

export interface WorkMark {
  correct: boolean
  feedback: string
}

const MarkingSchema = z.object({
  results: z.array(
    z.object({
      item: z.number().int().describe('The work number, starting at 1, in the order given'),
      correct: z.boolean().describe('True when the final answer is right and the method is sound'),
      feedback: z.string().describe('One to three sentences to the learner'),
    }),
  ),
})

const MARKING_SYSTEM_PROMPT = `You are a kind, exact marker at a school in Uganda. You read photos of work learners did on paper and mark each against the model answer.

For each piece of work:
- correct: true only when the final answer is right and the method is sound. Small presentation slips (spelling, untidy layout) do not make it wrong. A different valid method is fine.
- feedback: one to three sentences to the learner in simple English. Say what they did well first. If something is wrong, point to the exact step and show how to fix it, in the style of the explanation given.
- If the photo is unreadable, shows no work, or is for a different task, mark it not correct and say what to upload instead.
Never guess marks you cannot see. The teacher can read the photo too.`

/**
 * Marks each piece of work, in order. Returns null for a piece (or for all of them) when the AI could not mark it,
 * so the teacher reads it instead.
 */
export async function markWrittenWork(items: WorkToMark[], context: { subject: string; classLevel: string }): Promise<(WorkMark | null)[]> {
  if (!items.length) return []
  if (!aiConfigured()) return items.map(() => null)

  const prompt = `Mark these ${items.length} piece${items.length === 1 ? '' : 's'} of work. Subject: ${context.subject}. Class level: ${context.classLevel}.
The photos follow in the same order: photo 1 is work 1, and so on.

${items
  .map(
    (w, i) => `Work ${i + 1} (${w.competency})
Question: ${w.prompt}
Model answer and marking points: ${w.answer}
Explanation to use in feedback: ${w.explanation}`,
  )
  .join('\n\n')}`

  try {
    const result = await askGeminiForJson(
      MarkingSchema,
      MARKING_SYSTEM_PROMPT,
      prompt,
      'marking',
      items.map((w) => ({ mimeType: w.mimeType, data: w.data })),
    )
    if (!result) return items.map(() => null)
    return items.map((_, i) => {
      const r = result.results.find((x) => x.item === i + 1) ?? result.results[i]
      return r ? { correct: r.correct, feedback: r.feedback.trim() } : null
    })
  } catch (error) {
    logAiError(error)
    return items.map(() => null)
  }
}
