// How a typed or chosen answer is marked. Used when a student checks their answers (routes/practice.ts) and when
// their mastery is worked out from past practice (routes/mastery.ts).
// The frontend has the same rules in src/lib/marking.ts, for marking offline: keep the two the same.
//
// - Text: case, spaces, commas, full stops and quotation marks are ignored.
// - Numbers are compared as numbers: "0.7", ".7" and "0.70" are the same, "1.5" and "15" are not. Thousands
//   separators are ignored: "15,000", "15 000" and "15000" are the same.
// - A fraction, ratio or time must be written as in the key: "3/4" is not "3", "4", "6/8" or "0.75".
// - A unit or currency word is ignored when only the key or only the answer has one ("3 days" and "3").
//   When both have one it must be the same unit ("4500 m" is not "4500 km").
// - "a / b" in the key, with the spaces, accepts either a or b.
// - Open-ended items ("Answers will vary") count as done when attempted.
// - An option picked from a list (multiple choice) is right only when it is the key itself.

// Different ways of writing the same unit.
const UNIT_WORDS: Record<string, string> = {
  m: 'm metre meter',
  km: 'km kilometre kilometer',
  cm: 'cm centimetre centimeter',
  mm: 'mm millimetre millimeter',
  g: 'g gram gramme',
  kg: 'kg kilogram kilogramme kilo',
  l: 'l litre liter',
  ml: 'ml millilitre milliliter',
  sh: 'sh shs shilling ugx ush',
  sec: 's sec second',
  min: 'min minute',
  h: 'h hr hour',
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'yr year',
  '%': '% percent',
  am: 'am',
  pm: 'pm',
}
const UNITS = new Map(Object.entries(UNIT_WORDS).flatMap(([unit, words]) => words.split(' ').map((w) => [w, unit] as const)))
// Words that change the value, so they are never read as a unit: "3 tenths" is not 3.
const NOT_UNITS = new Set('and or not to k half halves quarter quarters third thirds ones tens tenth tenths hundred hundreds hundredth hundredths thousand thousands thousandth thousandths million millions billion dozen minus negative'.split(' '))

const isNumber = (t: string | undefined) => t !== undefined && /^\d/.test(t)
const isWord = (t: string | undefined) => t !== undefined && /^\p{L}/u.test(t)
const plain = (s: string) => s.trim().replace(/\s+/g, ' ')

// The numbers, words and signs in an answer, in order: "15,000 shillings" is ["15000", "shillings"].
// joinSpaces reads "3 000" as 3000; without it "100 200 300" stays a list of three numbers.
function tokens(text: string, joinSpaces: boolean): string[] {
  let s = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\u2212/g, '-')
    // "500/=" is how shillings are often written; "cm2" is how cm² is typed.
    .replace(/\/[=-]/g, ' shs ')
    .replace(/(^|[^a-z])(mm|cm|km|m)([23])(?![\d.])/g, (_, before: string, unit: string, power: string) => `${before}${unit}${power === '2' ? '²' : '³'}`)
    .replace(/(^|[^\d.,])(\d{1,3}(?:,\d{3})+)(?![\d,])/g, (_, before: string, n: string) => before + n.replace(/,/g, ''))
  if (joinSpaces) s = s.replace(/(^|[^\d.,])(\d{1,3}(?: \d{3})+)(?!\d)/g, (_, before: string, n: string) => before + n.replace(/ /g, ''))
  return (s.match(/\d+(?:\.\d+)?|\.\d+|\p{L}+|[^\s\p{L}\d.,;!?'"‘’“”()=]/gu) ?? []).map((t) => (/^[\d.]/.test(t) ? String(Number(t)) : t))
}

// The tokens as one string, with the spaces between words taken out: "Ice cream" and "icecream" are the same.
const joined = (t: string[]) => t.reduce((s, x, i) => s + (i > 0 && !(isWord(x) && isWord(t[i - 1])) ? ' ' : '') + x, '')

// The value ("15000", "3 / 4", "12 : 5") apart from the unit words before and after it ("shs", "days", "pm").
function valueAndUnit(t: string[]): { value: string; unit: string[] } | null {
  const first = t.findIndex(isNumber)
  if (first < 0) return null
  let last = t.length - 1
  while (!isNumber(t[last])) last--
  let start = 0
  while (start < first && isWord(t[start])) start++
  return { value: t.slice(start, last + 1).join(' '), unit: [...t.slice(0, start), ...t.slice(last + 1)] }
}

function sameUnit(a: string[], b: string[]): boolean {
  if ([...a, ...b].some((w) => NOT_UNITS.has(w))) return false
  if (!a.length || !b.length) return true
  const unit = (words: string[]) => {
    const u = words.join('')
    const one = u.replace(/s$/, '') || u
    return UNITS.get(u) ?? UNITS.get(one) ?? one
  }
  return unit(a) === unit(b)
}

function same(key: string, given: string, joinSpaces: boolean): boolean {
  const k = tokens(key, joinSpaces)
  const g = tokens(given, joinSpaces)
  // Nothing but punctuation (the answer to "Which mark ends a question?"): compared as typed.
  if (!k.length || !g.length) return plain(key).toLowerCase() === plain(given).toLowerCase()
  if (joined(k) === joined(g)) return true
  const kv = valueAndUnit(k)
  const gv = valueAndUnit(g)
  return kv !== null && gv !== null && kv.value === gv.value && sameUnit(kv.unit, gv.unit)
}

/** `options`: the choices of a multiple-choice question; leave out for a typed answer. */
export function isCorrect(answer: string, given: string, options?: string[] | null): boolean {
  if (!given.trim()) return false
  if (answer === 'Answers will vary') return true
  if (options?.length) {
    // Only a key that is not written exactly as one of the options is matched without regard to case.
    const key = options.find((o) => plain(o) === plain(answer))
    return key !== undefined ? plain(given) === plain(key) : plain(given).toLowerCase() === plain(answer).toLowerCase()
  }
  return [answer, ...answer.split(/\s+\/\s+/)].some((key) => {
    // A time is often written with a full stop: "12.05" for "12:05".
    const typed = /\d:\d\d/.test(key) ? given.replace(/(\d)\.(\d\d)(?!\d)/, '$1:$2') : given
    return same(key, typed, true) || same(key, typed, false)
  })
}
