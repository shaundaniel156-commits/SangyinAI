import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai'
import { z } from 'zod'

// The model can be changed in .env without touching code.
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash'
// Models to try, in order, when MODEL is overloaded ("high demand") even after retries. Empty string: none.
export const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.6-flash,gemini-3.5-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter((m) => m && m !== MODEL)
// How much the model thinks before answering: LOW is the fastest most models allow. See askGeminiForJson.
export const THINKING = (Object.values(ThinkingLevel) as string[]).includes(process.env.GEMINI_THINKING ?? '') ? (process.env.GEMINI_THINKING as ThinkingLevel) : ThinkingLevel.LOW
// Models that have refused THINKING (see askGeminiForJson).
const thinkingRefused = new Set<string>()
// Give up on a request after this long, so an unanswered call can't hang a teacher's page for minutes.
const REQUEST_TIMEOUT_MS = 60_000

// True when a key is set. Without one, the app uses the offline question bank.
export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
}

let client: GoogleGenAI | undefined

// One shared client. It reads GEMINI_API_KEY from the environment automatically.
export function getGemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ httpOptions: { timeout: REQUEST_TIMEOUT_MS } })
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

// Why a call failed, when another model (or waiting) might help. null: it won't (wrong key, bad request…).
// busy: Google says the model is overloaded. quota: this key's allowance for the model is used up (free tier).
// silent: no answer at all (a dropped connection or the timeout above).
type Setback = 'busy' | 'quota' | 'silent' | null
function setback(error: unknown): Setback {
  if (error instanceof ApiError) return BUSY_STATUSES.has(error.status) ? 'busy' : error.status === 429 ? 'quota' : null
  return error instanceof Error && /fetch failed|timeout|timed out|aborted/i.test(error.message) ? 'silent' : null
}
const SETBACK_TEXT: Record<Exclude<Setback, null>, string> = { busy: 'is still busy', quota: 'is over its quota for today', silent: 'did not answer' }

// After MODEL fails this way, requests skip it for a while instead of each waiting through its retries first.
const AVOID_MAIN_MS = 5 * 60_000
let avoidMainUntil = 0

// Gives up waiting after REQUEST_TIMEOUT_MS. The library's own timeout does not stop a request Google is sitting
// on (one was held for 14 minutes), so this is enforced here; a late answer is simply ignored.
function inTime<R>(work: Promise<R>): Promise<R> {
  let timer: ReturnType<typeof setTimeout>
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${REQUEST_TIMEOUT_MS / 1000}s`)), REQUEST_TIMEOUT_MS)
  })
  // The abandoned request may still fail later; that must not crash the server.
  work.catch(() => {})
  return Promise.race([work, limit]).finally(() => clearTimeout(timer))
}

// Runs a Gemini call with MODEL. When Google says it is busy, tries again up to twice; when that still fails,
// or the model is over quota or doesn't answer, tries each fallback model once. Other errors (wrong key, bad
// request) are not retried — waiting won't fix them. The call gets the model to use.
export async function withBusyRetry<R>(label: string, call: (model: string) => Promise<R>): Promise<R> {
  // While MODEL is known to be struggling, go straight to the fallback models.
  const skipMain = FALLBACK_MODELS.length > 0 && Date.now() < avoidMainUntil
  for (let attempt = 0; !skipMain; attempt++) {
    try {
      return await inTime(call(MODEL))
    } catch (error) {
      const why = setback(error)
      if (!why) throw error
      const delay = RETRY_DELAYS_MS[attempt]
      if (why === 'busy' && delay !== undefined) {
        console.log(`[ai] ${label} Gemini busy (${(error as ApiError).status}), retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 2} of ${RETRY_DELAYS_MS.length + 1})`)
        await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 1000))
        continue
      }
      if (!FALLBACK_MODELS.length) throw error
      avoidMainUntil = Date.now() + AVOID_MAIN_MS
      console.log(`[ai] ${label} ${MODEL} ${SETBACK_TEXT[why]}; using ${FALLBACK_MODELS.join(', then ')} for the next ${AVOID_MAIN_MS / 60_000} minutes`)
      break
    }
  }
  for (const [i, model] of FALLBACK_MODELS.entries()) {
    try {
      return await inTime(call(model))
    } catch (error) {
      const why = setback(error)
      if (!why || i === FALLBACK_MODELS.length - 1) throw error
      console.log(`[ai] ${label} ${model} ${SETBACK_TEXT[why]}`)
    }
  }
  throw new Error('unreachable')
}

// Asks Gemini for JSON in an exact shape, then checks the answer really fits that shape.
// Returns null if Gemini gave no usable answer (blocked by a safety filter, empty, or the wrong shape).
// files: documents for Gemini to read along with the prompt (a PDF or a photo, as base64).
export async function askGeminiForJson<T>(
  schema: z.ZodType<T>,
  systemInstruction: string,
  prompt: string,
  label: string,
  files: { mimeType: string; data: string }[] = [],
): Promise<T | null> {
  const contents = files.length ? [{ role: 'user', parts: [{ text: prompt }, ...files.map((inlineData) => ({ inlineData }))] }] : prompt
  const config = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseJsonSchema: toGeminiSchema(schema),
  }
  let used = MODEL
  const response = await withBusyRetry(label, async (model) => {
    used = model
    if (thinkingRefused.has(model)) return getGemini().models.generateContent({ model, contents, config })
    try {
      // Thinking is the slow part of a Gemini reply, and these tasks are well specified, so keep it low
      // (GEMINI_THINKING in .env picks another level, e.g. MEDIUM or HIGH, when answers need more care).
      return await getGemini().models.generateContent({ model, contents, config: { ...config, thinkingConfig: { thinkingLevel: THINKING } } })
    } catch (error) {
      // A model that doesn't take this thinking level refuses the whole request: ask again without it, and
      // remember, so later calls don't pay for a refused request each time.
      if (!(error instanceof ApiError) || error.status !== 400 || !/thinking/i.test(error.message)) throw error
      thinkingRefused.add(model)
      console.log(`[ai] ${label} ${model} does not accept thinkingLevel ${THINKING}; using the model's default thinking from now on`)
      return getGemini().models.generateContent({ model, contents, config })
    }
  })

  // Log what it cost (token counts) and why it stopped — never log student data.
  const usage = response.usageMetadata
  const finish = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? 'none'
  console.log(`[ai] ${label} ${used} in=${usage?.promptTokenCount ?? 0} out=${usage?.candidatesTokenCount ?? 0} thinking=${usage?.thoughtsTokenCount ?? 0} finish=${finish}`)

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
