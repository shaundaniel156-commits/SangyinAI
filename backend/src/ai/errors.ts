import { ApiError } from '@google/genai'
 
// Explains a failed Gemini call in plain words in the server log.
export function logAiError(error: unknown): void {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      console.error(`[ai] Gemini refused the request (${error.status}). Usually the key is missing, wrong or restricted — check GEMINI_API_KEY in .env.`)
    } else if (error.status === 429) {
      console.error('[ai] Too many requests or the quota is used up — wait a minute, or check your quota in Google AI Studio / Google Cloud.')
    } else if (error.status === 503) {
      console.error('[ai] Gemini was still busy after 3 tries (high demand). This is on Google\'s side and usually passes within minutes — the offline bank was used instead.')
    } else {
      console.error(`[ai] Gemini API error ${error.status}: ${error.message}`)
    }
  } else {
    console.error('[ai] Could not reach Gemini:', error)
  }
}
