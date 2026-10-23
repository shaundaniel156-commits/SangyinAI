import { ApiError, GoogleGenAI } from '@google/genai'
import { z } from 'zod'
 
// The model can be changed in .env without touching code.
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash'
 
// True when a key is set. Without one, the app uses the offline question bank.
export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
}
 
let client: GoogleGenAI | undefined
 
// One shared client. It reads GEMINI_API_KEY from the environment automatically.
export function getGemini(): GoogleGenAI {
  client ??= new GoogleGenAI({})
  return client
}
 
// Turns a Zod shape into the JSON schema Gemini understands (Gemini does not use the "$schema" line).
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _unused, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>
  return jsonSchema
}
 
// Waits before each retry when Gemini is busy: about 2 seconds, then about 5. A little randomness
// stops many teachers' retries from all hitting Google at the same moment.
const RETRY_DELAYS_MS = [2000, 5000]
const BUSY_STATUSES = new Set([500, 503, 504])

// Runs a Gemini call, trying again up to twice if Google says it is busy or had a temporary fault.
// Other errors (wrong key, quota used up, bad request) are not retried — waiting won't fix them.
async function withBusyRetry<R>(label: string, call: () => Promise<R>): Promise<R> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call()
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt]
      if (!(error instanceof ApiError) || !BUSY_STATUSES.has(error.status) || delay === undefined) throw error
      console.log(`[ai] ${label} Gemini busy (${error.status}), retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 2} of ${RETRY_DELAYS_MS.length + 1})`)
      await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 1000))
    }
  }
}

// Asks Gemini for JSON in an exact shape, then checks the answer really fits that shape.
// Returns null if Gemini gave no usable answer (blocked by a safety filter, empty, or the wrong shape).
export async function askGeminiForJson<T>(schema: z.ZodType<T>, systemInstruction: string, prompt: string, label: string): Promise<T | null> {
  const response = await withBusyRetry(label, () =>
    getGemini().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: toGeminiSchema(schema),
      },
    }),
  )
 
  // Log what it cost (token counts) and why it stopped — never log student data.
  const usage = response.usageMetadata
  const finish = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? 'none'
  console.log(`[ai] ${label} ${MODEL} in=${usage?.promptTokenCount ?? 0} out=${usage?.candidatesTokenCount ?? 0} thinking=${usage?.thoughtsTokenCount ?? 0} finish=${finish}`)
 
  if (!response.text) return null
  let json: unknown
  try {
    json = JSON.parse(response.text)
  } catch {
    return null
  }
  const checked = schema.safeParse(json)
  return checked.success ? checked.data : null
}
