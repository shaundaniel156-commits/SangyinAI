import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import { prisma } from '../db/client.ts'

// Reference material: turning uploaded documents into passages, and finding the passages relevant to an AI request.

const PASSAGE_CHARS = 1200

/** The text of an uploaded PDF, Word (.docx), text or Markdown file. */
export async function documentText(filename: string, data: Buffer): Promise<string> {
  if (/\.pdf$/i.test(filename)) {
    const pdf = await getDocumentProxy(new Uint8Array(data))
    const { text } = await extractText(pdf, { mergePages: true })
    return text
  }
  if (/\.docx$/i.test(filename)) return (await mammoth.extractRawText({ buffer: data })).value
  if (/\.(txt|md|markdown|csv)$/i.test(filename)) return data.toString('utf8')
  throw new Error('Upload a PDF, Word (.docx), text (.txt) or Markdown (.md) file.')
}

/** Splits text into passages of about PASSAGE_CHARS, keeping paragraphs together where possible. */
export function toPassages(text: string): string[] {
  const paragraphs = text.replace(/\r/g, '').split(/\n\s*\n|(?<=[.!?])\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 1)
  const passages: string[] = []
  let current = ''
  for (const p of paragraphs) {
    if (p.length > PASSAGE_CHARS) {
      if (current) { passages.push(current); current = '' }
      for (let i = 0; i < p.length; i += PASSAGE_CHARS) passages.push(p.slice(i, i + PASSAGE_CHARS))
      continue
    }
    if (current && current.length + p.length + 1 > PASSAGE_CHARS) { passages.push(current); current = '' }
    current = current ? `${current}\n${p}` : p
  }
  if (current) passages.push(current)
  return passages
}

const STOPWORDS = new Set('the and for with from that this into your are was were has have will can its their them they what when where which who how use using of to in on a an by or as at be is it'.split(' '))
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))

/**
 * The institution's passages most relevant to a request: documents whose subject/level match (or have none set),
 * ranked by how many of the request's words they contain. Returns at most `limit` passages (about 1 200 characters each).
 */
export async function relevantPassages(schoolId: string, query: { subject: string; level?: string; topics: string[]; limit?: number }) {
  const docs = await prisma.referenceDocument.findMany({
    where: { schoolId },
    select: { id: true, title: true, subject: true, level: true, chunks: { select: { text: true, position: true } } },
  })
  const matches = (field: string | null, wanted?: string) => !field || !wanted || field.toLowerCase().includes(wanted.toLowerCase()) || wanted.toLowerCase().includes(field.toLowerCase())
  const terms = new Set(words([...query.topics, query.subject].join(' ')))
  const topicPhrases = query.topics.map((t) => t.toLowerCase())
  const scored = docs
    .filter((d) => matches(d.subject, query.subject) && matches(d.level, query.level))
    .flatMap((d) => d.chunks.map((c) => {
      const text = c.text.toLowerCase()
      const hits = [...terms].filter((t) => text.includes(t)).length
      const phrase = topicPhrases.some((p) => text.includes(p)) ? 3 : 0
      return { title: d.title, text: c.text, score: hits + phrase }
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, query.limit ?? 3).map(({ title, text }) => ({ title, text }))
}
