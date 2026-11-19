import { ApiError } from '@google/genai'
 
// Explains a failed AI call in plain words in the server log. (When Claude, the backup, was tried and failed too,
// ai/ask.ts has already logged that.)
export function logAiError(error: unknown): void {
  if (error instanceof ApiError) {
    if (error.status === 400 && !/api[ _]key|billing|FAILED_PRECONDITION|location is not supported/i.test(error.message)) {
      // Not the key: something in the request itself, most often a photo or file Gemini could not read.
      console.error('[ai] Gemini could not use what it was sent (400). Usually a photo or document it cannot read (damaged, or not really the kind of file it says it is).')
    } else if (error.status === 400 || error.status === 401 || error.status === 403) {
      console.error(`[ai] Gemini refused the request (${error.status}). Usually the key is missing, wrong or restricted — check GEMINI_API_KEY in .env.`)
    } else if (error.status === 429) {
      console.error('[ai] Too many requests or the quota is used up — wait a minute, or check your quota in Google AI Studio / Google Cloud.')
    } else if (error.status === 503) {
      console.error('[ai] Gemini was still busy after 3 tries (high demand). This is on Google\'s side and usually passes within minutes — the offline bank was used instead.')
    } else {
      console.error(`[ai] Gemini API error ${error.status}: ${error.message}`)
    }
  } else {
    console.error('[ai] The AI could not be reached:', error instanceof Error ? error.message : error)
  }
}
