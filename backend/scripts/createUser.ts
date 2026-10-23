import { hash } from '@node-rs/argon2'
import { createInterface } from 'node:readline'
import { prisma } from '../src/db/client.ts'

// Creates a Sangyin account, or updates it if the email already exists (new password, name, role; set active).
// The password is typed in the terminal and never shown or saved; only its Argon2 hash goes into the database.
//
//   npm run user -- you@example.com admin "Your Name"
//   npm run user -- teacher@school.ug teacher "Amina Nakato" --classes c-p6a,c-p7a
//
// Roles: admin (sees the whole school), teacher (sees the classes given with --classes), parent, student.

const ROLES = ['admin', 'teacher', 'parent', 'student'] as const
type Role = (typeof ROLES)[number]

const args = process.argv.slice(2)
const classesAt = args.indexOf('--classes')
const classIds = classesAt >= 0 ? (args[classesAt + 1] ?? '').split(',').map((c) => c.trim()).filter(Boolean) : []
const [email, role, name] = args.filter((_, i) => classesAt < 0 || (i !== classesAt && i !== classesAt + 1))

if (!email?.includes('@') || !ROLES.includes(role as Role)) {
  console.log('Usage: npm run user -- <email> <admin|teacher|parent|student> "<Full Name>" [--classes c-p6a,c-p7a]')
  process.exit(1)
}

// Asks a question in the terminal; with hidden, the typed characters show as *.
function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void }
      out._writeToOutput = (s: string) => process.stdout.write(s.startsWith(question) ? question : s.includes('\n') ? s : '*')
    }
    rl.question(question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolve(answer)
    })
  })
}

// For scripted use (e.g. tests): NEW_USER_PASSWORD skips the prompt.
let password = process.env.NEW_USER_PASSWORD ?? ''
if (!password) {
  password = await ask('New password (at least 8 characters): ', true)
  const again = await ask('Type it again: ', true)
  if (password !== again) {
    console.log('The two passwords are different. Nothing was changed.')
    process.exit(1)
  }
}
if (password.length < 8) {
  console.log('The password must be at least 8 characters. Nothing was changed.')
  process.exit(1)
}

const school = await prisma.school.findFirst({ orderBy: { createdAt: 'asc' } })
if (!school) {
  console.log('No school in the database yet. Run `npx prisma db seed` first.')
  process.exit(1)
}
const found = new Set((await prisma.schoolClass.findMany({ where: { id: { in: classIds }, schoolId: school.id }, select: { id: true } })).map((c) => c.id))
const unknownClasses = classIds.filter((id) => !found.has(id))
if (unknownClasses.length) {
  console.log(`These classes don't exist: ${unknownClasses.join(', ')}. Nothing was changed.`)
  process.exit(1)
}

const passwordHash = await hash(password)
const normalised = email.trim().toLowerCase()
const existing = await prisma.user.findUnique({ where: { email: normalised } })
const user = await prisma.user.upsert({
  where: { email: normalised },
  update: { passwordHash, role: role as Role, status: 'active', ...(name ? { name } : {}), ...(classIds.length ? { classesTaught: { set: classIds.map((id) => ({ id })) } } : {}) },
  create: { schoolId: school.id, email: normalised, name: name || normalised.split('@')[0]!, role: role as Role, status: 'active', passwordHash, ...(classIds.length ? { classesTaught: { connect: classIds.map((id) => ({ id })) } } : {}) },
})

console.log(`${existing ? 'Updated' : 'Created'} ${user.role} account for ${user.name} <${user.email}> at ${school.name}.${classIds.length ? ` Teaches: ${classIds.join(', ')}.` : ''}`)
console.log('Sign in on the login page with this email and the password you just typed.')
await prisma.$disconnect()
