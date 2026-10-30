import { hash } from '@node-rs/argon2'
import { randomInt } from 'node:crypto'
import type { Role, SessionUser } from '../auth/session.ts'
import { prisma } from '../db/client.ts'
import { classScope } from '../routes/access.ts'
import { classLevels } from './classLevels.ts'

/**
 * The Manual feed: everything an institution can add by form or spreadsheet. Each kind lists its columns
 * (with the other headings people commonly use), checks every row, and applies the rows that pass.
 * Forms in the app send single rows through the same checks.
 */

export interface Column {
  key: string
  header: string
  aliases?: string[]
  required?: boolean
  example: string
  help: string
}

export type Row = Record<string, string>

export interface ApplyResult {
  created: number
  updated: number
  skipped: number
  notes: string[]
  /** New accounts and their one-time passwords, shown once to the admin. */
  accounts?: { name: string; email: string; role: string; tempPassword: string; phone?: string | null; emailSent?: boolean; smsSent?: boolean; deliveryError?: string }[]
}

export interface FeedKind {
  key: string
  label: string
  description: string
  roles: Role[]
  columns: Column[]
  /** Problems for each row (empty = ready). */
  check: (rows: Row[], user: SessionUser) => Promise<string[][]>
  apply: (rows: Row[], user: SessionUser) => Promise<ApplyResult>
}

// --- Helpers --------------------------------------------------------------------

const v = (row: Row, key: string) => (row[key] ?? '').trim()
const list = (s: string) => s.split(/[;\n]/).map((x) => x.trim()).filter(Boolean)
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

function required(row: Row, columns: Column[]): string[] {
  return columns.filter((c) => c.required && !v(row, c.key)).map((c) => `${c.header} is missing`)
}

function intOrProblem(row: Row, key: string, label: string, min: number, max: number): string[] {
  const raw = v(row, key)
  if (!raw) return []
  const n = Number(raw)
  return Number.isInteger(n) && n >= min && n <= max ? [] : [`${label} must be a whole number from ${min} to ${max}`]
}

// One-time passwords: easy to read out (no 0/O or 1/l), changed by the user after signing in.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
export function tempPassword(): string {
  return 'Sg-' + Array.from({ length: 9 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
}

async function findClass(schoolId: string, name: string) {
  return prisma.schoolClass.findFirst({ where: { schoolId, name: { equals: name, mode: 'insensitive' } }, orderBy: { academicYear: 'desc' } })
}

// --- Curriculum and courses ----------------------------------------------------------

const curriculumColumns: Column[] = [
  { key: 'programmeCode', header: 'Programme code', aliases: ['Programme', 'Course code (programme)'], example: 'BCS', help: 'Universities: the programme code, e.g. BCS. Leave empty for a school level.' },
  { key: 'programmeName', header: 'Programme name', example: 'Bachelor of Science in Computer Science', help: 'Needed the first time a programme code is used.' },
  { key: 'award', header: 'Award', example: "Bachelor's degree", help: 'Certificate, Diploma, Bachelor’s, Master’s…' },
  { key: 'years', header: 'Years', aliases: ['Duration'], example: '3', help: 'Length of the programme in years.' },
  { key: 'level', header: 'Level or year', aliases: ['Level', 'Year', 'Class level', 'Year of study'], required: true, example: 'Year 1', help: 'e.g. Year 1 (university), Senior 3 or Primary 6 (school).' },
  { key: 'subject', header: 'Subject or course unit', aliases: ['Subject', 'Course unit', 'Course', 'Module'], required: true, example: 'Introduction to Programming', help: 'The subject (school) or course unit (university).' },
  { key: 'courseCode', header: 'Course code', aliases: ['Unit code', 'Subject code', 'Module code'], example: 'CSC1101', help: 'Optional code for the subject or course unit.' },
  { key: 'term', header: 'Term or semester', aliases: ['Semester', 'Term'], example: 'Semester 1', help: 'Optional.' },
  { key: 'creditUnits', header: 'Credit units', aliases: ['Credits', 'CU'], example: '4', help: 'Optional, universities.' },
  { key: 'topic', header: 'Topic', required: true, example: 'Variables and data types', help: 'A topic in the subject or course unit.' },
  { key: 'topicDescription', header: 'Topic description', example: 'Storing and using values in a program.', help: 'Optional, a sentence in plain words.' },
  { key: 'competency', header: 'Learning outcome', aliases: ['Competency', 'Outcome', 'Learning outcome or competency'], example: 'Declares variables of the right type and uses them in expressions.', help: 'What learners should be able to do. One per row; repeat the topic for more.' },
  { key: 'objectiveCode', header: 'Objective code', aliases: ['Outcome code', 'Code'], example: 'CSC1101-LO1', help: 'Optional official code for the outcome.' },
  { key: 'objectiveText', header: 'Objective text', aliases: ['Official wording'], example: 'Write programs that use variables of appropriate data types.', help: 'Optional official wording, if your institution has the right to use it.' },
]

const curriculum: FeedKind = {
  key: 'curriculum',
  label: 'Curriculum and courses',
  description: 'Programmes, years or levels, subjects or course units, topics and learning outcomes. The AI aligns assessments and guidance to these.',
  roles: ['admin'],
  columns: curriculumColumns,
  async check(rows, user) {
    const known = new Set((await prisma.programme.findMany({ where: { schoolId: user.schoolId }, select: { code: true } })).map((p) => p.code.toLowerCase()))
    const namedInFile = new Set(rows.filter((r) => v(r, 'programmeCode') && v(r, 'programmeName')).map((r) => v(r, 'programmeCode').toLowerCase()))
    return rows.map((r) => [
      ...required(r, curriculumColumns),
      ...intOrProblem(r, 'years', 'Years', 1, 10),
      ...intOrProblem(r, 'creditUnits', 'Credit units', 0, 60),
      ...(v(r, 'programmeCode') && !known.has(v(r, 'programmeCode').toLowerCase()) && !namedInFile.has(v(r, 'programmeCode').toLowerCase()) ? [`Programme ${v(r, 'programmeCode')} is new: add its name`] : []),
      ...((v(r, 'objectiveCode') || v(r, 'objectiveText')) && !v(r, 'competency') ? ['An objective needs a learning outcome in the same row'] : []),
      ...(v(r, 'objectiveText') && !v(r, 'objectiveCode') ? ['An objective needs a code'] : []),
      ...(v(r, 'objectiveCode') && !v(r, 'objectiveText') ? ['An objective code needs its text'] : []),
    ])
  },
  async apply(rows, user) {
    const counts = { programmes: 0, levels: 0, subjects: 0, topics: 0, outcomes: 0, objectives: 0 }
    let updated = 0
    let skipped = 0
    for (const r of rows) {
      let programme = null
      if (v(r, 'programmeCode')) {
        const code = v(r, 'programmeCode')
        const existing = await prisma.programme.findUnique({ where: { schoolId_code: { schoolId: user.schoolId, code } } })
        const fields = { ...(v(r, 'programmeName') ? { name: v(r, 'programmeName') } : {}), ...(v(r, 'award') ? { award: v(r, 'award') } : {}), ...(v(r, 'years') ? { years: Number(v(r, 'years')) } : {}) }
        if (existing) {
          programme = Object.keys(fields).length ? await prisma.programme.update({ where: { id: existing.id }, data: fields }) : existing
        } else {
          programme = await prisma.programme.create({ data: { schoolId: user.schoolId, code, name: v(r, 'programmeName'), ...fields } })
          counts.programmes++
        }
      }

      let level = await prisma.curriculumLevel.findFirst({ where: { schoolId: user.schoolId, programmeId: programme?.id ?? null, name: { equals: v(r, 'level'), mode: 'insensitive' } } })
      if (!level) {
        const position = await prisma.curriculumLevel.count({ where: { schoolId: user.schoolId, programmeId: programme?.id ?? null } })
        level = await prisma.curriculumLevel.create({ data: { framework: 'institution', name: v(r, 'level'), stage: programme ? programme.name : 'Own curriculum', schoolId: user.schoolId, programmeId: programme?.id ?? null, position } })
        counts.levels++
      }

      const code = v(r, 'courseCode')
      let subject = await prisma.curriculumSubject.findFirst({ where: { levelId: level.id, ...(code ? { code: { equals: code, mode: 'insensitive' } } : { name: { equals: v(r, 'subject'), mode: 'insensitive' } }) } })
      const subjectFields = { name: v(r, 'subject'), ...(code ? { code } : {}), ...(v(r, 'term') ? { term: v(r, 'term') } : {}), ...(v(r, 'creditUnits') ? { creditUnits: Number(v(r, 'creditUnits')) } : {}) }
      if (subject) {
        subject = await prisma.curriculumSubject.update({ where: { id: subject.id }, data: subjectFields })
      } else {
        subject = await prisma.curriculumSubject.create({ data: { levelId: level.id, position: await prisma.curriculumSubject.count({ where: { levelId: level.id } }), ...subjectFields } })
        counts.subjects++
      }

      let topic = await prisma.curriculumTopic.findFirst({ where: { subjectId: subject.id, name: { equals: v(r, 'topic'), mode: 'insensitive' } } })
      if (topic) {
        if (v(r, 'topicDescription') && topic.description !== v(r, 'topicDescription')) {
          topic = await prisma.curriculumTopic.update({ where: { id: topic.id }, data: { description: v(r, 'topicDescription') } })
          updated++
        }
      } else {
        topic = await prisma.curriculumTopic.create({ data: { levelId: level.id, subjectId: subject.id, name: v(r, 'topic'), description: v(r, 'topicDescription') || null, position: await prisma.curriculumTopic.count({ where: { subjectId: subject.id } }) } })
        counts.topics++
      }

      if (v(r, 'competency')) {
        let competency = await prisma.curriculumCompetency.findFirst({ where: { topicId: topic.id, name: { equals: v(r, 'competency'), mode: 'insensitive' } } })
        if (!competency) {
          competency = await prisma.curriculumCompetency.create({ data: { topicId: topic.id, name: v(r, 'competency'), position: await prisma.curriculumCompetency.count({ where: { topicId: topic.id } }) } })
          counts.outcomes++
        }
        if (v(r, 'objectiveCode')) {
          const exists = await prisma.learningObjective.findFirst({ where: { competencyId: competency.id, schoolId: user.schoolId, code: v(r, 'objectiveCode') } })
          if (exists) skipped++
          else {
            await prisma.learningObjective.create({ data: { competencyId: competency.id, code: v(r, 'objectiveCode'), text: v(r, 'objectiveText'), schoolId: user.schoolId, createdById: user.sub, position: await prisma.learningObjective.count({ where: { competencyId: competency.id } }) } })
            counts.objectives++
          }
        }
      }
    }
    const created = Object.values(counts).reduce((a, b) => a + b, 0)
    const notes = Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${n} new ${n === 1 ? k.replace(/s$/, '') : k}`)
    return { created, updated, skipped, notes: notes.length ? notes : ['Nothing new: everything was already there.'] }
  },
}

// --- Question bank ------------------------------------------------------------------------

const questionColumns: Column[] = [
  { key: 'subject', header: 'Subject or course unit', aliases: ['Subject', 'Course unit', 'Course'], required: true, example: 'Mathematics', help: 'Where the question belongs.' },
  { key: 'level', header: 'Level or year', aliases: ['Level', 'Class level', 'Year'], example: 'Primary 6', help: 'Optional, e.g. Primary 6, Senior 2, Year 1.' },
  { key: 'competency', header: 'Topic or skill', aliases: ['Topic', 'Skill', 'Competency'], required: true, example: 'Ratio and Proportion', help: 'The topic or skill it tests. Use the same names as your curriculum.' },
  { key: 'type', header: 'Type', aliases: ['Question type'], example: 'multiple_choice', help: 'multiple_choice or short_answer (MCQ / short answer also work).' },
  { key: 'difficulty', header: 'Difficulty', example: 'foundation', help: 'foundation, core or stretch (easy / medium / hard also work). Default core.' },
  { key: 'question', header: 'Question', aliases: ['Prompt', 'Question text'], required: true, example: 'Share 20 sweets in the ratio 3 : 2. How many are in the larger share?', help: 'The question as students will see it.' },
  { key: 'optionA', header: 'Option A', aliases: ['A'], example: '12', help: 'Multiple choice only.' },
  { key: 'optionB', header: 'Option B', aliases: ['B'], example: '8', help: '' },
  { key: 'optionC', header: 'Option C', aliases: ['C'], example: '10', help: '' },
  { key: 'optionD', header: 'Option D', aliases: ['D'], example: '15', help: '' },
  { key: 'answer', header: 'Answer', aliases: ['Correct answer', 'Key'], required: true, example: 'A', help: 'Multiple choice: the letter or the option text. Short answer: the answer.' },
  { key: 'explanation', header: 'Explanation', aliases: ['Working', 'Feedback'], required: true, example: '3 + 2 = 5 parts; 20 ÷ 5 = 4; 3 × 4 = 12.', help: 'Shown after answering, so learners see the method.' },
]

function questionType(raw: string): 'multiple_choice' | 'short_answer' | null {
  const s = raw.toLowerCase().replace(/[^a-z]/g, '')
  if (!s || ['multiplechoice', 'mcq', 'mc', 'objective'].includes(s)) return 'multiple_choice'
  if (['shortanswer', 'short', 'sa', 'open', 'structured'].includes(s)) return 'short_answer'
  return null
}
function difficulty(raw: string): 'foundation' | 'core' | 'stretch' | null {
  const s = raw.toLowerCase().trim()
  if (!s || ['core', 'medium', 'moderate', 'average'].includes(s)) return 'core'
  if (['foundation', 'easy', 'basic', 'low'].includes(s)) return 'foundation'
  if (['stretch', 'hard', 'difficult', 'high', 'challenge'].includes(s)) return 'stretch'
  return null
}
function questionFrom(r: Row) {
  const type = questionType(v(r, 'type'))
  const options = ['optionA', 'optionB', 'optionC', 'optionD'].map((k) => v(r, k)).filter(Boolean)
  const letter = /^[A-Da-d]$/.test(v(r, 'answer')) ? 'ABCD'.indexOf(v(r, 'answer').toUpperCase()) : -1
  const answer = type === 'multiple_choice' && letter >= 0 ? ['optionA', 'optionB', 'optionC', 'optionD'].map((k) => v(r, k))[letter] ?? '' : v(r, 'answer')
  return { type, difficulty: difficulty(v(r, 'difficulty')), options: type === 'multiple_choice' ? options : [], answer }
}

const questions: FeedKind = {
  key: 'questions',
  label: 'Question bank',
  description: 'Reviewed questions with answers and explanations. Used when offline, for “Regenerate”, and as style examples for the AI.',
  roles: ['teacher', 'admin'],
  columns: questionColumns,
  async check(rows) {
    return rows.map((r) => {
      const q = questionFrom(r)
      return [
        ...required(r, questionColumns),
        ...(q.type ? [] : ['Type must be multiple_choice or short_answer']),
        ...(q.difficulty ? [] : ['Difficulty must be foundation, core or stretch']),
        ...(q.type === 'multiple_choice' && q.options.length < 2 ? ['Multiple choice needs at least 2 options'] : []),
        ...(q.type === 'multiple_choice' && v(r, 'answer') && !q.options.includes(q.answer) ? ['The answer must be one of the options (or its letter)'] : []),
      ]
    })
  },
  async apply(rows, user) {
    let created = 0
    let skipped = 0
    for (const r of rows) {
      const q = questionFrom(r)
      const duplicate = await prisma.bankQuestion.findFirst({ where: { schoolId: user.schoolId, competency: { equals: v(r, 'competency'), mode: 'insensitive' }, prompt: v(r, 'question') } })
      if (duplicate) { skipped++; continue }
      await prisma.bankQuestion.create({
        data: { schoolId: user.schoolId, createdById: user.sub, subject: v(r, 'subject'), level: v(r, 'level') || null, competency: v(r, 'competency'), type: q.type!, difficulty: q.difficulty!, prompt: v(r, 'question'), options: q.options, answer: q.answer, explanation: v(r, 'explanation') },
      })
      created++
    }
    return { created, updated: 0, skipped, notes: [`${created} question${created === 1 ? '' : 's'} added${skipped ? `, ${skipped} already in the bank` : ''}.`] }
  },
}

// --- Classes and cohorts ------------------------------------------------------------------

const classColumns: Column[] = [
  { key: 'name', header: 'Class name', aliases: ['Class', 'Cohort', 'Stream', 'Name'], required: true, example: 'BCS Year 1 (2026)', help: 'e.g. P6 A, S3 East, BCS Year 1 (2026).' },
  { key: 'level', header: 'Level or year', aliases: ['Level', 'Year'], required: true, example: 'Year 1', help: 'Shown on class pages, e.g. Primary 6, Senior 3, Year 1.' },
  { key: 'framework', header: 'Curriculum', aliases: ['Framework'], example: 'institution', help: 'uganda, cambridge, or institution (your own curriculum / university programme). Default uganda.' },
  { key: 'academicYear', header: 'Academic year', aliases: ['Year of entry', 'Session'], example: '2026', help: 'Default: this year.' },
  { key: 'subjects', header: 'Subjects or course units', aliases: ['Subjects', 'Course units'], example: 'Introduction to Programming; Discrete Mathematics', help: 'Separate with semicolons.' },
  { key: 'teacherEmail', header: 'Class teacher email', aliases: ['Teacher email', 'Lecturer email', 'Class teacher'], example: 'lecturer@uni.ac.ug', help: 'Optional. Add staff first.' },
  { key: 'curriculumLevel', header: 'Curriculum level', aliases: ['Programme year'], example: 'BCS Year 1', help: 'Optional: links the class to a curriculum level, e.g. Primary 6 or BCS Year 1, so the AI uses its topics.' },
]

async function findCurriculumLevel(schoolId: string, framework: string, name: string) {
  const candidates = await prisma.curriculumLevel.findMany({ where: { OR: [{ schoolId: null }, { schoolId }] }, include: { programme: true } })
  const label = (l: (typeof candidates)[number]) => (l.programme ? `${l.programme.code} ${l.name}` : l.name)
  return candidates.find((l) => l.framework === framework && same(label(l), name)) ?? candidates.find((l) => same(label(l), name)) ?? null
}

const classes: FeedKind = {
  key: 'classes',
  label: 'Classes and cohorts',
  description: 'Classes (schools) or cohorts (universities), their level, curriculum, subjects and class teacher.',
  roles: ['admin'],
  columns: classColumns,
  async check(rows, user) {
    return Promise.all(rows.map(async (r) => {
      const framework = v(r, 'framework').toLowerCase() || 'uganda'
      const teacher = v(r, 'teacherEmail') ? await prisma.user.findFirst({ where: { schoolId: user.schoolId, email: v(r, 'teacherEmail').toLowerCase(), role: { in: ['teacher', 'admin'] } } }) : null
      return [
        ...required(r, classColumns),
        ...(['uganda', 'cambridge', 'institution'].includes(framework) ? [] : ['Curriculum must be uganda, cambridge or institution']),
        ...intOrProblem(r, 'academicYear', 'Academic year', 2000, 2100),
        ...(v(r, 'teacherEmail') && !teacher ? [`No teacher or admin account with ${v(r, 'teacherEmail')}: add staff first`] : []),
        ...(v(r, 'curriculumLevel') && !(await findCurriculumLevel(user.schoolId, framework, v(r, 'curriculumLevel'))) ? [`No curriculum level called ${v(r, 'curriculumLevel')}`] : []),
      ]
    }))
  },
  async apply(rows, user) {
    let created = 0
    let updated = 0
    for (const r of rows) {
      const framework = (v(r, 'framework').toLowerCase() || 'uganda') as 'uganda' | 'cambridge' | 'institution'
      const academicYear = Number(v(r, 'academicYear') || new Date().getFullYear())
      const teacher = v(r, 'teacherEmail') ? await prisma.user.findFirst({ where: { schoolId: user.schoolId, email: v(r, 'teacherEmail').toLowerCase() } }) : null
      const level = v(r, 'curriculumLevel') ? await findCurriculumLevel(user.schoolId, framework, v(r, 'curriculumLevel')) : null
      const data = {
        level: v(r, 'level'),
        framework,
        ...(v(r, 'subjects') ? { subjects: list(v(r, 'subjects')) } : {}),
        ...(teacher ? { teacherId: teacher.id } : {}),
        ...(level ? { curriculumLevelId: level.id } : {}),
      }
      const existing = await prisma.schoolClass.findUnique({ where: { schoolId_name_academicYear: { schoolId: user.schoolId, name: v(r, 'name'), academicYear } } })
      if (existing) {
        await prisma.schoolClass.update({ where: { id: existing.id }, data })
        updated++
      } else {
        await prisma.schoolClass.create({ data: { schoolId: user.schoolId, name: v(r, 'name'), academicYear, subjects: [], ...data } })
        created++
      }
    }
    return { created, updated, skipped: 0, notes: [`${created} class${created === 1 ? '' : 'es'} added, ${updated} updated.`] }
  },
}

// --- Students ----------------------------------------------------------------------------

const studentColumns: Column[] = [
  { key: 'name', header: 'Student name', aliases: ['Name', 'Full name', 'Learner name'], required: true, example: 'Amina Nakato', help: 'Full name.' },
  { key: 'className', header: 'Class', aliases: ['Class name', 'Cohort', 'Stream'], required: true, example: 'BCS Year 1 (2026)', help: 'One of the classes you teach.' },
  { key: 'regNumber', header: 'Registration number', aliases: ['Reg number', 'Reg no', 'Student number', 'LIN', 'Learner number'], example: '26/U/12345', help: 'Optional but recommended: used to update the same student next time.' },
  { key: 'studentEmail', header: 'Student email', aliases: ['Learner email'], example: 'amina@example.com', help: 'Optional: creates the student’s own sign-in for the student portal.' },
  { key: 'guardianName', header: 'Parent or guardian name', aliases: ['Guardian name', 'Parent name', 'Guardian'], example: 'Joseph Nakato', help: 'Optional.' },
  { key: 'guardianEmail', header: 'Parent or guardian email', aliases: ['Guardian email', 'Parent email'], example: 'parent@example.com', help: 'Optional: creates (or links) a parent account for the parent portal.' },
  { key: 'guardianPhone', header: 'Parent or guardian phone', aliases: ['Guardian phone', 'Parent phone', 'Phone'], example: '+256700000000', help: 'Optional.' },
]

// A class the teacher leads or teaches a subject in, by name. Teachers only add students to their own classes.
function findOwnClass(user: SessionUser, name: string) {
  return prisma.schoolClass.findFirst({ where: { ...classScope(user), name: { equals: name, mode: 'insensitive' } }, orderBy: { academicYear: 'desc' } })
}

// The student a row updates: the same registration number, or the same name in the same class.
function findExistingStudent(schoolId: string, classId: string | undefined, r: Row) {
  if (v(r, 'regNumber')) return prisma.student.findUnique({ where: { schoolId_regNumber: { schoolId, regNumber: v(r, 'regNumber') } } })
  if (!classId) return Promise.resolve(null)
  return prisma.student.findFirst({ where: { schoolId, classId, name: { equals: v(r, 'name'), mode: 'insensitive' } } })
}

const students: FeedKind = {
  key: 'students',
  label: 'Students',
  description: 'Students in your classes, with registration numbers and (optionally) their own and their parents’ accounts.',
  roles: ['teacher'],
  columns: studentColumns,
  async check(rows, user) {
    const seen = new Map<string, number>()
    for (const r of rows) if (v(r, 'regNumber')) seen.set(v(r, 'regNumber'), (seen.get(v(r, 'regNumber')) ?? 0) + 1)
    return Promise.all(rows.map(async (r) => {
      const cls = v(r, 'className') ? await findOwnClass(user, v(r, 'className')) : null
      const existing = await findExistingStudent(user.schoolId, cls?.id, r)
      // A registration number already used in someone else's class can't be moved or renamed from here.
      const otherClass = existing && !(await prisma.schoolClass.findFirst({ where: { ...classScope(user), id: existing.classId }, select: { id: true } }))
      const studentEmail = v(r, 'studentEmail').toLowerCase()
      const emailOwner = isEmail(studentEmail) ? await prisma.user.findUnique({ where: { email: studentEmail } }) : null
      return [
        ...required(r, studentColumns),
        ...(v(r, 'className') && !cls ? [`You don't teach a class called ${v(r, 'className')}`] : []),
        ...(otherClass ? ['This registration number belongs to a student in a class you don’t teach'] : []),
        ...((seen.get(v(r, 'regNumber')) ?? 0) > 1 ? ['The same registration number appears more than once'] : []),
        ...(studentEmail && !isEmail(studentEmail) ? ['Student email is not a valid email address'] : []),
        ...(emailOwner && emailOwner.id !== existing?.userId ? ['The student email already belongs to another account'] : []),
        ...(v(r, 'guardianEmail') && !isEmail(v(r, 'guardianEmail')) ? ['Parent email is not a valid email address'] : []),
      ]
    }))
  },
  async apply(rows, user) {
    let created = 0
    let updated = 0
    const accounts: NonNullable<ApplyResult['accounts']> = []
    const notes: string[] = []
    for (const r of rows) {
      const cls = (await findOwnClass(user, v(r, 'className')))!
      const fields = { name: v(r, 'name'), classId: cls.id, ...(v(r, 'guardianName') ? { guardianName: v(r, 'guardianName') } : {}) }
      const existing = await findExistingStudent(user.schoolId, cls.id, r)
      const student = existing
        ? await prisma.student.update({ where: { id: existing.id }, data: fields })
        : await prisma.student.create({ data: { schoolId: user.schoolId, regNumber: v(r, 'regNumber') || null, ...fields } })
      if (existing) updated++
      else created++

      // The student's own sign-in, the first time an email is given for them.
      const studentEmail = v(r, 'studentEmail').toLowerCase()
      if (studentEmail && !student.userId) {
        const password = tempPassword()
        const account = await prisma.user.create({ data: { schoolId: user.schoolId, email: studentEmail, name: student.name, role: 'student', status: 'active', passwordHash: await hash(password) } })
        await prisma.student.update({ where: { id: student.id }, data: { userId: account.id } })
        accounts.push({ name: account.name, email: studentEmail, role: 'student', tempPassword: password })
      }

      const email = v(r, 'guardianEmail').toLowerCase()
      if (!email) continue
      let parent = await prisma.user.findUnique({ where: { email } })
      if (parent && (parent.role !== 'parent' || parent.schoolId !== user.schoolId)) {
        notes.push(`${email} already belongs to another account, so it was not linked to ${student.name} as a parent.`)
        continue
      }
      if (!parent) {
        const password = tempPassword()
        parent = await prisma.user.create({ data: { schoolId: user.schoolId, email, name: v(r, 'guardianName') || email.split('@')[0]!, role: 'parent', status: 'active', phone: v(r, 'guardianPhone') || null, passwordHash: await hash(password) } })
        accounts.push({ name: parent.name, email, role: 'parent', tempPassword: password, phone: parent.phone })
      }
      await prisma.studentGuardian.upsert({ where: { studentId_guardianId: { studentId: student.id, guardianId: parent.id } }, update: {}, create: { studentId: student.id, guardianId: parent.id } })
    }
    return { created, updated, skipped: 0, notes: [`${created} student${created === 1 ? '' : 's'} added, ${updated} updated.`, ...notes], accounts }
  },
}

// --- Staff ------------------------------------------------------------------------------------

const staffColumns: Column[] = [
  { key: 'name', header: 'Name', aliases: ['Full name', 'Staff name'], required: true, example: 'Dr. Sarah Achieng', help: 'Full name.' },
  { key: 'email', header: 'Email', aliases: ['Email address'], required: true, example: 'sachieng@uni.ac.ug', help: 'Used to sign in.' },
  { key: 'role', header: 'Role', example: 'teacher', help: 'teacher (also lecturer / tutor) or admin. Default teacher.' },
  { key: 'subjects', header: 'Subjects or course units', aliases: ['Subjects', 'Course units'], example: 'Introduction to Programming', help: 'Separate with semicolons.' },
  { key: 'classes', header: 'Classes taught', aliases: ['Classes', 'Cohorts'], example: 'BCS Year 1 (2026)', help: 'Class names, separated with semicolons. Add classes first.' },
  { key: 'phone', header: 'Phone', example: '+256700000000', help: 'Optional.' },
]

// The school's standard class name (e.g. "Primary 3", "Grade 8") matching this one, if any: such classes are made on first use.
async function standardClassName(schoolId: string, name: string) {
  const school = await prisma.school.findUniqueOrThrow({ where: { id: schoolId } })
  return classLevels(school.type, school.framework).find((l) => same(l, name)) ?? null
}

function staffRole(raw: string): 'teacher' | 'admin' | null {
  const s = raw.toLowerCase().trim()
  if (!s || ['teacher', 'lecturer', 'tutor', 'instructor', 'professor', 'teaching assistant'].includes(s)) return 'teacher'
  if (['admin', 'administrator', 'head teacher', 'registrar', 'dean'].includes(s)) return 'admin'
  return null
}

const staff: FeedKind = {
  key: 'staff',
  label: 'Staff accounts',
  description: 'Teachers, lecturers and administrators. New accounts get a one-time password to pass on; they change it after signing in.',
  roles: ['admin'],
  columns: staffColumns,
  async check(rows, user) {
    return Promise.all(rows.map(async (r) => {
      const other = isEmail(v(r, 'email')) ? await prisma.user.findUnique({ where: { email: v(r, 'email').toLowerCase() } }) : null
      const missing = await Promise.all(list(v(r, 'classes')).map(async (c) => ((await findClass(user.schoolId, c)) || (await standardClassName(user.schoolId, c)) ? null : c)))
      return [
        ...required(r, staffColumns),
        ...(v(r, 'email') && !isEmail(v(r, 'email')) ? ['Email is not a valid email address'] : []),
        ...(staffRole(v(r, 'role')) ? [] : ['Role must be teacher (lecturer) or admin']),
        ...(v(r, 'password') && (v(r, 'password').length < 8 || v(r, 'password').length > 200) ? ['The password must be at least 8 characters'] : []),
        ...(other && (other.schoolId !== user.schoolId || !['teacher', 'admin'].includes(other.role)) ? ['This email belongs to another account'] : []),
        ...missing.filter(Boolean).map((c) => `No class called ${c}`),
      ]
    }))
  },
  async apply(rows, user) {
    let created = 0
    let updated = 0
    const accounts: NonNullable<ApplyResult['accounts']> = []
    for (const r of rows) {
      const email = v(r, 'email').toLowerCase()
      // Standard classes not made yet (e.g. "Primary 3") are added now; the first teacher assigned leads them.
      const newClassIds: string[] = []
      for (const c of list(v(r, 'classes'))) {
        const name = !(await findClass(user.schoolId, c)) && (await standardClassName(user.schoolId, c))
        if (!name) continue
        const school = await prisma.school.findUniqueOrThrow({ where: { id: user.schoolId } })
        const made = await prisma.schoolClass.create({ data: { schoolId: user.schoolId, name, level: name, framework: school.framework, academicYear: new Date().getFullYear(), subjects: [] } })
        newClassIds.push(made.id)
      }
      const classIds = (await Promise.all(list(v(r, 'classes')).map((c) => findClass(user.schoolId, c)))).filter(Boolean).map((c) => ({ id: c!.id }))
      const fields = { name: v(r, 'name'), role: staffRole(v(r, 'role'))!, ...(v(r, 'subjects') ? { subjects: list(v(r, 'subjects')) } : {}), ...(v(r, 'phone') ? { phone: v(r, 'phone') } : {}) }
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        await prisma.user.update({ where: { id: existing.id }, data: { ...fields, ...(classIds.length ? { classesTaught: { set: classIds } } : {}) } })
        updated++
      } else {
        // A password the administrator chose (the Invite form; not a template column), otherwise a random one.
        const password = v(r, 'password') || tempPassword()
        await prisma.user.create({ data: { schoolId: user.schoolId, email, status: 'active', passwordHash: await hash(password), ...fields, ...(classIds.length ? { classesTaught: { connect: classIds } } : {}) } })
        accounts.push({ name: fields.name, email, role: fields.role, tempPassword: password, phone: fields.phone ?? null })
        created++
      }
      if (newClassIds.length) {
        const teacher = await prisma.user.findUniqueOrThrow({ where: { email } })
        await prisma.schoolClass.updateMany({ where: { id: { in: newClassIds } }, data: { teacherId: teacher.id } })
      }
    }
    return { created, updated, skipped: 0, notes: [`${created} account${created === 1 ? '' : 's'} created, ${updated} updated.`], accounts }
  },
}

export const FEED_KINDS: Record<string, FeedKind> = { curriculum, questions, classes, students, staff }
