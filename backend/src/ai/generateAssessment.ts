import { aiConfigured, askGeminiForJson } from './client.ts'
import { logAiError } from './errors.ts'
import { institutionContext } from './institution.ts'
import { offlineDraft } from './offline.ts'
import { ASSESSMENT_SYSTEM_PROMPT, buildAssessmentPrompt } from './prompts.ts'
import { AssessmentDraftSchema, type AssessmentDraft, type GenerateAssessmentRequest } from './schemas.ts'

export interface GenerateResult {
  draft: AssessmentDraft
  source: 'gemini' | 'offline'
}

// schoolId: the signed-in user's institution, so drafts can use its reference material and question bank.
export async function generateAssessment(request: GenerateAssessmentRequest, schoolId?: string): Promise<GenerateResult> {
  // 0. What the institution has fed in for these topics (empty when it has nothing yet).
  const context = await institutionContext(schoolId, { subject: request.subject, level: request.classLevel, topics: request.competencies })

  // 1. No API key? Use the offline question bank (the institution's own questions first) so the feature still works.
  if (!aiConfigured()) return { draft: offlineDraft(request, context.bank), source: 'offline' }

  try {
    // 2. Ask Gemini for a draft in our exact shape (askGeminiForJson also logs the cost and checks the shape).
    const draft = await askGeminiForJson(AssessmentDraftSchema, ASSESSMENT_SYSTEM_PROMPT, buildAssessmentPrompt(request, context), 'assessment')

    // 3. Blocked, empty or the wrong shape? Fall back instead of failing.
    if (!draft) return { draft: offlineDraft(request, context.bank), source: 'offline' }
    return { draft, source: 'gemini' }
  } catch (error) {
    // 4. Network problems, a wrong key or a busy service: explain in the log, keep the app working.
    logAiError(error)
    return { draft: offlineDraft(request, context.bank), source: 'offline' }
  }
}
