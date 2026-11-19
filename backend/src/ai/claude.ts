import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { z } from 'zod'

// Claude (Anthropic): the backup AI, used only when Gemini cannot do the work (ai/ask.ts decides when).
// Without ANTHROPIC_API_KEY there is no backup and the app behaves exactly as it does with Gemini alone.
// Claude is paid for by use, so everything here is bounded: how much it may write, how much it is sent, how long
// it is waited for, how often it is tried, and how many calls it gets in a day.

// The model can be changed in .env without touching code (claude-haiku-5-5 is cheaper and faster, claude-opus-5-5 the most able).
export const claudeModel = () => process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-5-5'

// True when a key is set.
export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

// The most Claude may write in one answer (in tokens, about three-quarters of a word each), for each kind of work:
// what the largest real answer needs, and some room.
// - assessment: 15 questions at about 300 tokens each, a teaching plan of up to 5 topics at about 550, and the
//   title, messages and reasons: about 9,000.
// - guidance: 6 teaching steps and 6 learner steps with examples, the teacher sheet and the notes: about 3,500.
// - marking: up to 15 pieces of work at about 100. exam-diagnosis: 12 competencies and 5 next steps: about 800.
const JSON_MAX_TOKENS: Record<string, number> = { assessment: 12_000, guidance: 6_000, marking: 3_000, 'exam-diagnosis': 2_000 }
const JSON_MAX_TOKENS_OTHER = 4_000
// A chat reply: about 1,500 words. A longer one is cut there and says so.
const CHAT_MAX_TOKENS = 2_000
// A conversation sent to Claude is trimmed to its most recent turns within this many characters (Gemini gets it all).
const CHAT_INPUT_CHARS = 30_000

// How long Claude is waited for. By the time it is asked, the person has usually waited through Gemini's tries.
const JSON_TIMEOUT_MS = 60_000
const CHAT_FIRST_PIECE_MS = 30_000
const CHAT_WHOLE_REPLY_MS = 120_000
// A call that fails within this time for a passing reason (busy, rate limit, dropped connection) is tried once
// more. One that failed slowly (a timeout) is not: the wait would double.
const QUICK_FAILURE_MS = 10_000
// Added to a chat reply that was stopped for length or for time.
const CUT_SHORT = '\n\n(This reply was cut short to keep it brief. Ask me to continue.)'

// --- When Claude is left alone ---------------------------------------------------------------------

// Calls to Claude today (UTC), for the whole server. Kept in memory, so a restart starts the count again.
// AI_BACKUP_MAX_CALLS_PER_DAY changes the limit; an Anthropic spending limit is the real ceiling on cost.
const callsPerDay = () => {
  const set = process.env.AI_BACKUP_MAX_CALLS_PER_DAY?.trim()
  const max = set ? Number.parseInt(set, 10) : Number.NaN
  return Number.isFinite(max) && max >= 0 ? max : 300
}
const today = () => new Date(Date.now()).toISOString().slice(0, 10)
let countedDay = ''
let callsToday = 0
let limitLogged = false
// After Anthropic refuses the key, Claude is not tried again for this long (every try would fail the same way).
const KEY_REFUSED_PAUSE_MS = 30 * 60_000
let pausedUntil = 0

/** True when Claude can be asked right now: a key is set, the key has not just been refused, and today's calls are not used up. */
export function claudeUsable(): boolean {
  if (!claudeConfigured() || Date.now() < pausedUntil) return false
  if (countedDay !== today()) {
    countedDay = today()
    callsToday = 0
    limitLogged = false
  }
  if (callsToday < callsPerDay()) return true
  if (!limitLogged) console.warn(`[ai] the backup AI (Claude) has had its ${callsPerDay()} calls for today (AI_BACKUP_MAX_CALLS_PER_DAY). It is not used again until midnight UTC.`)
  limitLogged = true
  return false
}

let client: Anthropic | undefined
let clientKey: string | undefined

// One shared client. The library's own retries are off: the one retry allowed is made here (attempt).
function getClaude(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY!.trim()
  if (!client || clientKey !== apiKey) {
    client = new Anthropic({ apiKey, maxRetries: 0 })
    clientKey = apiKey
  }
  return client
}

const passing = (error: unknown) => error instanceof Anthropic.APIError && (error.status === undefined || error.status === 429 || error.status >= 500)

// Makes one call to Claude, counted towards the day's limit, and once more if it failed quickly for a passing reason.
async function attempt<R>(call: () => Promise<R>): Promise<R> {
  for (let tries = 1; ; tries++) {
    const began = Date.now()
    callsToday++
    try {
      return await call()
    } catch (error) {
      if (error instanceof Anthropic.APIError && (error.status === 401 || error.status === 403)) {
        pausedUntil = Date.now() + KEY_REFUSED_PAUSE_MS
        console.error(`[ai] Anthropic refused the key (${error.status}). The backup AI (Claude) is not tried again for ${KEY_REFUSED_PAUSE_MS / 60_000} minutes: check ANTHROPIC_API_KEY.`)
      }
      if (tries > 1 || !passing(error) || Date.now() - began > QUICK_FAILURE_MS || !claudeUsable()) throw error
    }
  }
}

/** Why a Claude call failed, in words safe for the log: the status and Anthropic's error type, never the request. */
export function claudeFailure(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 401) return 'Anthropic rejected the key (401): check ANTHROPIC_API_KEY'
    if (error.status === 403) return 'the Anthropic key is not allowed to do this (403)'
    if (error.status === 429) return 'Anthropic says too many requests or the spending limit is reached (429)'
    if (error.status === undefined) return `Anthropic could not be reached (${error.name})`
    const type = (error.error as { error?: { type?: string } } | undefined)?.error?.type
    return `Anthropic replied ${error.status}${type ? ` ${type}` : ''}`
  }
  return error instanceof Error ? (error.constructor === Error ? error.message : error.name) : 'unknown error'
}

// A PDF or a photo, as Claude takes them. Other kinds of file cannot be sent.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type ImageType = (typeof IMAGE_TYPES)[number]
export function claudeReads(mimeType: string): boolean {
  return mimeType === 'application/pdf' || (IMAGE_TYPES as readonly string[]).includes(mimeType)
}

/**
 * The JSON shape as Claude takes it. Anthropic's own helper leaves out the limits its structured output does not
 * hold answers to (smallest and largest numbers, list lengths other than "at least one") and writes them into
 * the description instead; the answer is checked against the full shape afterwards, as a Gemini answer is.
 */
export function claudeFormat(schema: z.ZodType) {
  const { type, schema: jsonSchema } = zodOutputFormat(schema)
  return { type, schema: jsonSchema }
}

/**
 * Asks Claude for JSON in an exact shape, then checks the answer the same way a Gemini answer is checked.
 * Returns null if Claude gave no usable answer (it declined, ran out of room, or the shape is wrong).
 * label: the kind of work (assessment, guidance, marking, exam-diagnosis), which sets how much Claude may write.
 */
export async function askClaudeForJson<T>(schema: z.ZodType<T>, system: string, prompt: string, label: string, files: { mimeType: string; data: string }[] = []): Promise<T | null> {
  const model = claudeModel()
  const response = await attempt(() =>
    getClaude().messages.create(
      {
        model,
        max_tokens: JSON_MAX_TOKENS[label] ?? JSON_MAX_TOKENS_OTHER,
        system,
        messages: [
          {
            role: 'user',
            content: [
              // Documents and photos first, then the question about them.
              ...files.map((f) =>
                f.mimeType === 'application/pdf'
                  ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data } } as const)
                  : ({ type: 'image', source: { type: 'base64', media_type: f.mimeType as ImageType, data: f.data } } as const),
              ),
              { type: 'text', text: prompt },
            ],
          },
        ],
        // Structured output: Claude's answer is held to this JSON shape.
        output_config: { format: claudeFormat(schema) },
      },
      { timeout: JSON_TIMEOUT_MS },
    ),
  )

  // Log what it cost (token counts) and why it stopped — never log student data.
  console.log(`[ai] ${label} ${model} in=${response.usage.input_tokens} out=${response.usage.output_tokens} finish=${response.stop_reason ?? 'none'}`)

  // Cut off for length (the JSON is unfinished) or declined: no usable answer.
  if (response.stop_reason === 'max_tokens' || response.stop_reason === 'refusal') return null
  const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
  if (!text) return null
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return null
  }
  const checked = schema.safeParse(json)
  return checked.success ? checked.data : null
}

/**
 * The conversation as Claude takes it: turns in a row from the same side joined into one (so they always go user,
 * AI, user…), then the most recent of them that fit in CHAT_INPUT_CHARS, opening with the user. A single turn
 * longer than that keeps its start and its end.
 */
export function recentTurns(turns: { role: 'user' | 'ai'; text: string }[]): { role: 'user' | 'ai'; text: string }[] {
  const joined: { role: 'user' | 'ai'; text: string }[] = []
  for (const turn of turns) {
    const last = joined.at(-1)
    if (last?.role === turn.role) last.text += `\n\n${turn.text}`
    else joined.push({ role: turn.role, text: turn.text })
  }
  const kept: { role: 'user' | 'ai'; text: string }[] = []
  let room = CHAT_INPUT_CHARS
  for (const turn of joined.toReversed()) {
    if (turn.text.length > room) {
      // The latest turn is always sent, shortened if it must be.
      if (!kept.length) kept.push({ role: turn.role, text: `${turn.text.slice(0, Math.floor(room * 0.6))}\n[… part left out …]\n${turn.text.slice(-Math.floor(room * 0.4))}` })
      break
    }
    kept.push(turn)
    room -= turn.text.length
  }
  kept.reverse()
  // Claude's conversations open with the user: an AI turn before the first question is left out.
  return kept.slice(Math.max(0, kept.findIndex((t) => t.role === 'user')))
}

/**
 * Claude's reply to a conversation, piece by piece as it writes it. Throws before the first piece if Claude can't
 * be reached, does not start writing in time, or writes nothing.
 */
export async function* claudeChatStream(system: string, turns: { role: 'user' | 'ai'; text: string }[], label: string): AsyncGenerator<string> {
  const model = claudeModel()
  // Stops the request when the first piece, or the whole reply, takes too long.
  const stop = new AbortController()
  let slow = ''
  const waitFor = (ms: number, what: string) => setTimeout(() => ((slow = what), stop.abort()), ms)
  let firstPiece: ReturnType<typeof setTimeout> | undefined = waitFor(CHAT_FIRST_PIECE_MS, `did not start its reply within ${CHAT_FIRST_PIECE_MS / 1000}s`)
  const wholeReply = waitFor(CHAT_WHOLE_REPLY_MS, `was still writing after ${CHAT_WHOLE_REPLY_MS / 1000}s`)
  let tokensIn = 0
  let tokensOut = 0
  let finish = 'none'
  // Blank space before the first words is held back, so a reply of nothing but blank space is caught below.
  let blank = ''
  let wrote = false
  try {
    const stream = await attempt(() =>
      getClaude().messages.create({ model, max_tokens: CHAT_MAX_TOKENS, system, messages: recentTurns(turns).map((t) => ({ role: t.role === 'user' ? ('user' as const) : ('assistant' as const), content: t.text })), stream: true }, { signal: stop.signal }),
    )
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        if (!wrote && !event.delta.text.trim()) {
          blank += event.delta.text
          continue
        }
        clearTimeout(firstPiece)
        firstPiece = undefined
        yield wrote ? event.delta.text : blank + event.delta.text
        wrote = true
      } else if (event.type === 'message_start') tokensIn = event.message.usage.input_tokens
      else if (event.type === 'message_delta') {
        tokensOut = event.usage.output_tokens
        finish = event.delta.stop_reason ?? finish
      }
    }
  } catch (error) {
    // Stopped here for taking too long (dealt with below); anything else is a real failure.
    if (!slow) throw error
  } finally {
    clearTimeout(firstPiece)
    clearTimeout(wholeReply)
  }
  // Stopping the request can also end the stream quietly, so this is checked whether or not an error came.
  if (slow) {
    // Nothing went out: a failure, so the person gets the usual error (or Gemini is tried).
    if (!wrote) throw new Error(`Claude did not start its reply within ${CHAT_FIRST_PIECE_MS / 1000}s`)
    console.log(`[ai] ${label} ${model} in=${tokensIn} finish=stopped at the ${CHAT_WHOLE_REPLY_MS / 1000}s limit`)
    yield CUT_SHORT
    return
  }
  console.log(`[ai] ${label} ${model} in=${tokensIn} out=${tokensOut} finish=${finish}`)
  if (!wrote) throw new Error('Claude sent an empty reply')
  if (finish === 'max_tokens') yield CUT_SHORT
}

/** For tests: forget the day's count and any pause. */
export function resetClaude() {
  countedDay = ''
  callsToday = 0
  limitLogged = false
  pausedUntil = 0
}
