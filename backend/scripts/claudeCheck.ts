import type { z } from 'zod'
import { askClaudeForJson, claudeChatStream, claudeConfigured, claudeFailure, claudeModel, claudeUsable } from '../src/ai/claude.ts'
import { ExamDiagnosisSchema } from '../src/ai/examDiagnosis.ts'
import { GuidancePlanSchema } from '../src/ai/guidance.ts'
import { MarkingSchema } from '../src/ai/markWork.ts'
import { AssessmentDraftSchema } from '../src/ai/schemas.ts'

// Checks that Claude, the backup AI, really answers with the key in .env, for each thing the app uses it for:
// a conversation reply written piece by piece (Ask AI), and an answer in each exact shape the app asks for
// (assessment builder, guidance plan, exam diagnosis, and marking with a photo). The prompts ask for the smallest
// answers that fit, so the whole run costs about a cent or two. Nothing is saved and the key is never shown.
//
//   npm run claude

if (!claudeConfigured()) {
  console.log('ANTHROPIC_API_KEY is empty in backend/.env, so there is no backup AI. Add the key and run this again.')
  process.exit(1)
}
console.log(`Asking Claude (${claudeModel()})…\n`)

const BRIEF = 'You are helping test a school app in Uganda. Keep every piece of text to one short sentence and every list as short as the instructions allow.'
// A plain white square, 16 by 16: there is no work on it, which the marker should say.
const BLANK_PHOTO = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFElEQVR4nGP4TyJgGNUwqmH4agAAr639H708R/EAAAAASUVORK5CYII='

let failed = 0
async function check(name: string, run: () => Promise<string>) {
  try {
    console.log(`PASS  ${name}: ${await run()}`)
  } catch (error) {
    failed++
    console.log(`FAIL  ${name}: ${claudeFailure(error)}`)
    // A refused key fails everything the same way: stop here instead of asking four more times.
    if (!claudeUsable()) {
      console.log('\nStopped: Anthropic does not accept the key. Put a valid ANTHROPIC_API_KEY in backend/.env and run this again.')
      process.exit(1)
    }
  }
}
// One answer in one of the app's shapes. label is the app's own name for the work, so its real size limit applies.
async function shaped<T>(schema: z.ZodType<T>, label: string, prompt: string, show: (answer: T) => string, files: { mimeType: string; data: string }[] = []) {
  const answer = await askClaudeForJson(schema, BRIEF, prompt, label, files)
  if (!answer) throw new Error('Claude answered, but not in the shape the app needs (see the "finish=" line above)')
  return show(answer)
}

await check('Ask AI (conversation, written piece by piece)', async () => {
  let reply = ''
  let pieces = 0
  for await (const text of claudeChatStream(`${BRIEF} Answer in one short sentence.`, [{ role: 'user', text: 'What is 7 times 8?' }], 'check')) {
    reply += text
    pieces++
  }
  return `${pieces} piece${pieces === 1 ? '' : 's'}: ${reply.trim()}`
})
await check('Assessment builder', () =>
  shaped(AssessmentDraftSchema, 'assessment', 'Primary 5 Mathematics. Write a draft with exactly 1 short_answer question on adding fractions with the same denominator, and a teaching plan with exactly 1 topic of 2 steps.', (d) => `"${d.title}", ${d.questions.length} question, ${d.teachingPlan.topics.length} topic in the teaching plan`),
)
await check('Guidance plan', () =>
  shaped(GuidancePlanSchema, 'guidance', 'Primary 5 Mathematics. Competency gap: adding fractions with the same denominator (mastery 40%). Write the plan with 2 teaching steps and 2 learner steps.', (p) => `method "${p.teachingApproach.method}", ${p.sequence.length} teaching steps, ${p.outputs.studentGuide.length} learner steps`),
)
await check('Exam diagnosis', () =>
  shaped(ExamDiagnosisSchema, 'exam-diagnosis', 'Primary 5 Mathematics, end of term exam. Marks: Fractions 4/10, Decimals 8/10. Diagnose with 2 competencies and 1 next step.', (d) => `${d.competencies.length} competencies, ${d.nextSteps.length} next step`),
)
await check('Marking a photo', () =>
  shaped(
    MarkingSchema,
    'marking',
    'Mark this 1 piece of work. Subject: Mathematics. Class level: Primary 5.\nWork 1\nQuestion: 1/4 + 2/4\nModel answer: 3/4\nThe photo is attached. If it shows no work, mark it not correct and say what to upload.',
    (m) => `${m.results.length} result, correct: ${m.results[0]?.correct}`,
    [{ mimeType: 'image/png', data: BLANK_PHOTO }],
  ),
)

console.log(failed ? `\n${failed} of 5 FAILED. Claude cannot be relied on as the backup until these pass.` : '\nAll 5 passed: Claude answers in every shape the app needs. It will take over by itself when Gemini cannot do the work.')
process.exit(failed ? 1 : 0)
