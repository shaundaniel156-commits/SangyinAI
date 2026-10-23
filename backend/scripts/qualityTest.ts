import { mkdir, writeFile } from 'node:fs/promises'
import { MODEL } from '../src/ai/client.ts'
import { generateAssessment } from '../src/ai/generateAssessment.ts'
import type { AssessmentDraft, GenerateAssessmentRequest } from '../src/ai/schemas.ts'

// The 10-request quality test (AI guide, Part 14). Runs each request through the same code the
// server uses, then writes a report to quality/ for a teacher to read and score.
// Run from backend: npm run quality   (or GEMINI_MODEL=another-model npm run quality to compare models)

const base = { curriculumObjectives: [] as string[], types: ['multiple_choice', 'short_answer'] as GenerateAssessmentRequest['types'], reportNotes: '' }
const REQUESTS: { name: string; request: GenerateAssessmentRequest }[] = [
  { name: 'P6 Maths, one gap, mixed, no notes', request: { ...base, classLevel: 'P6', framework: 'uganda', subject: 'Mathematics', competencies: ['Ratio and Proportion'], classSummary: ['Ratio and Proportion: 9 of 32 students need support, 11 developing (class mastery 48%).'], questionCount: 5, difficulty: 'mixed' } },
  { name: 'P6 Maths, one gap, with notes', request: { ...base, classLevel: 'P6', framework: 'uganda', subject: 'Mathematics', competencies: ['Ratio and Proportion'], classSummary: ['Ratio and Proportion: 8 of 30 students need support (class mastery 52%).'], questionCount: 5, difficulty: 'mixed', reportNotes: 'Many learners write the ratio the wrong way round, e.g. 3:2 instead of 2:3.' } },
  { name: 'P5 Maths, two gaps, foundation', request: { ...base, classLevel: 'P5', framework: 'uganda', subject: 'Mathematics', competencies: ['Fractions', 'Decimals'], classSummary: ['Fractions: 14 of 35 need support.', 'Decimals: 12 of 35 need support.'], questionCount: 6, difficulty: 'foundation' } },
  { name: 'P7 Maths, three gaps, mixed', request: { ...base, classLevel: 'P7', framework: 'uganda', subject: 'Mathematics', competencies: ['Percentages', 'Measurement', 'Whole Numbers'], classSummary: ['Percentages: 10 of 40 need support.', 'Measurement: 7 of 40 need support.', 'Whole Numbers: 5 of 40 need support.'], questionCount: 8, difficulty: 'mixed' } },
  { name: 'S1 Maths, stretch, multiple choice only', request: { ...base, classLevel: 'S1', framework: 'uganda', subject: 'Mathematics', competencies: ['Percentages'], classSummary: ['Percentages: most students secure on basics; 6 of 45 still developing.'], questionCount: 4, difficulty: 'stretch', types: ['multiple_choice'] } },
  { name: 'P4 English, reading, foundation, with notes', request: { ...base, classLevel: 'P4', framework: 'uganda', subject: 'English', competencies: ['Reading Comprehension'], classSummary: ['Reading Comprehension: 15 of 38 need support (class mastery 41%).'], questionCount: 5, difficulty: 'foundation', reportNotes: 'Learners can find facts in a text but struggle to explain why something happened.' } },
  { name: 'P6 English, grammar, core, short answer only', request: { ...base, classLevel: 'P6', framework: 'uganda', subject: 'English', competencies: ['Grammar'], classSummary: ['Grammar: 9 of 30 need support, mostly verb tenses.'], questionCount: 5, difficulty: 'core', types: ['short_answer'] } },
  { name: 'P7 English, two gaps, mixed', request: { ...base, classLevel: 'P7', framework: 'uganda', subject: 'English', competencies: ['Grammar', 'Composition Writing'], classSummary: ['Grammar: 8 of 36 need support.', 'Composition Writing: 13 of 36 need support.'], questionCount: 6, difficulty: 'mixed' } },
  { name: 'Cambridge Stage 6 Maths, core', request: { ...base, classLevel: 'Stage 6', framework: 'cambridge', subject: 'Mathematics', competencies: ['Fractions'], classSummary: ['Fractions: 6 of 24 need support (class mastery 58%).'], questionCount: 5, difficulty: 'core' } },
  { name: 'P5 Maths, long notes, mixed', request: { ...base, classLevel: 'P5', framework: 'uganda', subject: 'Mathematics', competencies: ['Measurement'], classSummary: ['Measurement: 11 of 33 need support.'], questionCount: 5, difficulty: 'mixed', reportNotes: 'Converting between cm and m is weak. Several learners measured from the end of the ruler, not from zero. Time problems (adding hours and minutes) also caused many errors in the last test. We have rulers and a wall clock in class but no measuring tapes.' } },
]

// Automatic checks a computer can do. Correctness, level, English, local relevance and explanations need a teacher.
function autoChecks(r: GenerateAssessmentRequest, d: AssessmentDraft): string[] {
  const problems: string[] = []
  if (d.questions.length !== r.questionCount) problems.push(`${d.questions.length} questions instead of ${r.questionCount}`)
  d.questions.forEach((q, i) => {
    const n = `Q${i + 1}`
    if (!r.competencies.includes(q.competency)) problems.push(`${n} targets "${q.competency}", which was not requested`)
    if (!r.types.includes(q.type)) problems.push(`${n} is ${q.type}, which was not allowed`)
    if (r.difficulty !== 'mixed' && q.difficulty !== r.difficulty) problems.push(`${n} is ${q.difficulty}, not ${r.difficulty}`)
    if (q.type === 'multiple_choice') {
      if (q.options.length !== 4) problems.push(`${n} has ${q.options.length} options, not 4`)
      if (!q.options.includes(q.answer)) problems.push(`${n} answer is not one of its options`)
    }
  })
  return problems
}

const date = new Date().toISOString().slice(0, 10)
const lines: string[] = []
const summary: string[] = []
let geminiCount = 0

for (const [i, { name, request }] of REQUESTS.entries()) {
  const started = Date.now()
  process.stdout.write(`${i + 1}/${REQUESTS.length} ${name} ... `)
  const { draft, source } = await generateAssessment(request)
  const seconds = Math.round((Date.now() - started) / 1000)
  const problems = autoChecks(request, draft)
  if (source === 'gemini') geminiCount++
  console.log(`${source}, ${seconds}s, ${problems.length ? `${problems.length} problem(s)` : 'checks passed'}`)

  summary.push(`| ${i + 1} | ${name} | ${source} | ${seconds}s | ${problems.length ? problems.length : 'passed'} |  |`)
  lines.push(`## ${i + 1}. ${name}`, '')
  lines.push(`Source: **${source}** · ${seconds}s · ${request.classLevel} ${request.subject} · ${request.competencies.join(', ')} · ${request.difficulty} · ${request.types.join(' + ')}`)
  if (request.reportNotes) lines.push('', `Teacher notes: _${request.reportNotes}_`)
  lines.push('', problems.length ? `Automatic checks: ${problems.map((p) => `\n- ${p}`).join('')}` : 'Automatic checks: all passed.', '')
  lines.push(`**${draft.title}**`, '')
  draft.questions.forEach((q, n) => {
    lines.push(`${n + 1}. (${q.difficulty}, ${q.competency}) ${q.prompt}`)
    q.options.forEach((o) => lines.push(`    - ${o === q.answer ? `**${o}** ✓` : o}`))
    if (q.type === 'short_answer') lines.push(`    - Answer: **${q.answer}**`)
    lines.push(`    - _Explanation: ${q.explanation}_`)
  })
  lines.push('', `Parent note: ${draft.parentNote}`, '')
  lines.push('| Correct answers | Right level | Clear English | Local relevance | Good explanations | Total /25 |', '| --- | --- | --- | --- | --- | --- |', '| /5 | /5 | /5 | /5 | /5 |  |', '')
}

const report = [
  `# Quality test — ${MODEL} — ${date}`,
  '',
  `${geminiCount} of ${REQUESTS.length} drafts came from Gemini; the rest fell back to the offline bank.`,
  'Score each Gemini draft out of 5 for each criterion as a teacher would. Change one thing in prompts.ts at a time, run again, and compare totals.',
  '',
  '| # | Request | Source | Time | Automatic checks | Total /25 |',
  '| --- | --- | --- | --- | --- | --- |',
  ...summary,
  '',
  ...lines,
].join('\n')

await mkdir('quality', { recursive: true })
const file = `quality/${date}-${MODEL}.md`
await writeFile(file, report)
console.log(`\nReport written to backend/${file}`)
