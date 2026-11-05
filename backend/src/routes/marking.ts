// How a typed or chosen answer is marked. Used when a student checks their answers (routes/practice.ts) and when
// their mastery is worked out from past practice (routes/mastery.ts).

// The same rules as the frontend's TakeAssessmentModal: ignore case, spaces, commas and full stops;
// "a / b" accepts either; open-ended items ("Answers will vary") count as done when attempted.
const normalise = (s: string) => s.toLowerCase().replace(/[\s,.]/g, '')

export function isCorrect(answer: string, given: string): boolean {
  if (!given.trim()) return false
  if (answer === 'Answers will vary') return true
  return answer.split('/').some((a) => normalise(a) === normalise(given)) || normalise(answer) === normalise(given)
}
