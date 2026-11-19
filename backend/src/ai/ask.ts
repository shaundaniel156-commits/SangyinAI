import { ApiError } from '@google/genai'
import type { z } from 'zod'
import { aiConfigured as geminiConfigured, askGeminiForJson, geminiChatStream } from './client.ts'
import { askClaudeForJson, claudeChatStream, claudeConfigured, claudeFailure, claudeModel, claudeReads, claudeUsable } from './claude.ts'

// The one way the app asks an AI for anything. Gemini does the work (its main model, then its fallback models:
// ai/client.ts). Claude is the backup (ai/claude.ts): it takes over when Gemini fails in a way that asking Gemini
// again will not fix. Without ANTHROPIC_API_KEY there is no backup and everything behaves as it does with Gemini alone.

/** Which AI wrote an answer. */
export type AiProvider = 'gemini' | 'claude'

/** True when at least one AI can be asked. Without any, the app uses its offline question bank and templates. */
export function aiAvailable(): boolean {
  return geminiConfigured() || claudeConfigured()
}

// After Claude has had to step in, requests go straight to Claude for this long instead of each waiting through
// Gemini's retries first; then Gemini is tried again. AI_BACKUP_COOLDOWN_MINUTES changes it (0: always try Gemini first).
const cooldownMs = () => {
  const set = process.env.AI_BACKUP_COOLDOWN_MINUTES?.trim()
  const minutes = set ? Number(set) : Number.NaN
  return (Number.isFinite(minutes) && minutes >= 0 ? minutes : 5) * 60_000
}
let straightToClaudeUntil = 0
const skippingGemini = () => Date.now() < straightToClaudeUntil

/**
 * Why Claude should take over after this Gemini failure, or null when it should not. It should when Gemini itself
 * is the problem: busy or failing (500 and above, after its own retries and fallback models), over its quota or
 * rate limit (429), not answering (a dropped connection or a timeout), or refusing the key, the billing or the
 * model (401, 403, 404, and the 400s that say so). It should not when the request is the problem (any other 400,
 * too large, and so on): Claude would be sent the same request.
 */
export function backupReason(error: unknown): string | null {
  if (error instanceof ApiError) {
    if (error.status >= 500) return `was busy or failing (${error.status})`
    if (error.status === 429) return 'is over its quota or rate limit (429)'
    if (error.status === 401 || error.status === 403) return `refused the key or permission (${error.status})`
    if (error.status === 404) return 'does not have the model asked for (404)'
    if (error.status === 400 && /api[ _]key|billing|FAILED_PRECONDITION|location is not supported/i.test(error.message)) return 'refused the key or the billing set-up (400)'
    return null
  }
  if (error instanceof Error && /fetch failed|timeout|timed out|aborted|network|socket|ECONN|ENOTFOUND|EAI_AGAIN/i.test(error.message)) return 'did not answer'
  if (error instanceof Error && /api key/i.test(error.message)) return 'has no usable key'
  return null
}

// Claude answered in Gemini's place: say so in the log (which AI, which model and why — nothing of the request),
// and send the next requests straight to Claude for a while.
function servedByBackup(label: string, why: string) {
  const wasSkipping = skippingGemini()
  if (geminiConfigured() && !wasSkipping) straightToClaudeUntil = Date.now() + cooldownMs()
  const next = geminiConfigured() && !wasSkipping && cooldownMs() ? ` Requests go straight to Claude for the next ${cooldownMs() / 60_000} minutes, then Gemini is tried again.` : ''
  console.log(`[ai] ${label} served by the backup AI: claude ${claudeModel()}, because ${why}.${next}`)
}
function backupFailed(label: string, error: unknown) {
  // Gemini is tried first again from the next request on.
  straightToClaudeUntil = 0
  console.error(`[ai] ${label} the backup AI (claude ${claudeModel()}) FAILED too: ${claudeFailure(error)}`)
}
// What callers see when Claude was the only AI to ask and it failed (they log it and fall back, as for Gemini).
const backupError = (error: unknown) => new Error(`The backup AI (Claude) failed: ${claudeFailure(error)}`)

/**
 * Asks for JSON in an exact shape. Returns the answer and which AI wrote it, or null when the AI gave no usable
 * answer (blocked, empty or the wrong shape: the caller falls back, as before). Throws when no AI could be reached.
 * files: documents for the AI to read along with the prompt (a PDF or a photo, as base64).
 */
export async function askAiForJson<T>(
  schema: z.ZodType<T>,
  systemInstruction: string,
  prompt: string,
  label: string,
  files: { mimeType: string; data: string }[] = [],
): Promise<{ value: T; source: AiProvider } | null> {
  // Claude can stand in only when it can be asked right now (ai/claude.ts: a key, not just refused, calls left
  // today) and can read everything the request carries.
  const backup = claudeUsable() && files.every((f) => claudeReads(f.mimeType))
  const fromClaude = async () => {
    const value = await askClaudeForJson(schema, systemInstruction, prompt, label, files)
    return value === null ? null : { value, source: 'claude' as const }
  }
  const fromGemini = async () => {
    const value = await askGeminiForJson(schema, systemInstruction, prompt, label, files)
    return value === null ? null : { value, source: 'gemini' as const }
  }

  let claudeTried = false
  if (backup && (!geminiConfigured() || skippingGemini())) {
    claudeTried = true
    try {
      const answer = await fromClaude()
      if (answer || !geminiConfigured()) {
        servedByBackup(label, geminiConfigured() ? 'Gemini failed a few minutes ago' : 'no Gemini key is set')
        return answer
      }
      // Claude answered but not usably (the wrong shape, cut off, or declined): Gemini gets one try before the
      // caller falls back, and if it answers it is first again from now on.
      console.log(`[ai] ${label} the backup AI's answer could not be used; trying Gemini`)
    } catch (error) {
      backupFailed(label, error)
      if (!geminiConfigured()) throw backupError(error)
    }
  }
  try {
    const answer = await fromGemini()
    if (answer && claudeTried) straightToClaudeUntil = 0
    return answer
  } catch (error) {
    const why = backupReason(error)
    if (!why || !backup || claudeTried) throw error
    try {
      const answer = await fromClaude()
      servedByBackup(label, `Gemini ${why}`)
      return answer
    } catch (claudeError) {
      backupFailed(label, claudeError)
      throw error
    }
  }
}

/**
 * The AI's reply to a conversation, piece by piece as it writes it. Throws when no AI can be reached. Claude can
 * take over only before the first piece: once part of Gemini's reply has gone out, a failure ends the reply.
 */
export async function* aiChatStream(systemInstruction: string, turns: { role: 'user' | 'ai'; text: string }[], label: string): AsyncGenerator<string> {
  const backup = claudeUsable()
  let claudeTried = false
  if (backup && (!geminiConfigured() || skippingGemini())) {
    claudeTried = true
    let started = false
    try {
      for await (const text of claudeChatStream(systemInstruction, turns, label)) {
        if (!started) servedByBackup(label, geminiConfigured() ? 'Gemini failed a few minutes ago' : 'no Gemini key is set')
        started = true
        yield text
      }
      return
    } catch (error) {
      backupFailed(label, error)
      if (started || !geminiConfigured()) throw backupError(error)
    }
  }

  let started = false
  let geminiError: unknown
  try {
    for await (const text of geminiChatStream(systemInstruction, turns, label)) {
      started = true
      yield text
    }
    return
  } catch (error) {
    const why = backupReason(error)
    if (started || !why || !backup || claudeTried) throw error
    geminiError = error
    started = false
    try {
      for await (const text of claudeChatStream(systemInstruction, turns, label)) {
        if (!started) servedByBackup(label, `Gemini ${why}`)
        started = true
        yield text
      }
    } catch (claudeError) {
      backupFailed(label, claudeError)
      // Nothing has gone out yet: the caller sees Gemini's failure, as it would with no backup.
      throw started ? backupError(claudeError) : geminiError
    }
  }
}

/** For tests: forget that Gemini failed. */
export function resetBackup() {
  straightToClaudeUntil = 0
}
