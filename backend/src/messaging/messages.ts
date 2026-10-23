import { prisma } from '../db/client.ts'
import { sendEmail, sendSms, type SendResult } from './channels.ts'

// What Sangyin sends, and to whom. Account details and password resets always go (people need them);
// updates and notification copies follow each person's email/SMS preferences.

const appUrl = () => (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const ROLE_NAME: Record<string, string> = { teacher: 'teacher', admin: 'administrator', parent: 'parent', student: 'student' }

interface Email {
  subject: string
  html: string
  text: string
}

/** A plain, readable email: greeting, paragraphs, optional button, footer. */
function email(subject: string, greeting: string, paragraphs: string[], button?: { label: string; url: string }, footer = 'You are receiving this because you have an account on Sangyin AI.'): Email {
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#1f4e79;letter-spacing:.3px">SANGYIN AI</p>
<p style="margin:0 0 12px;font-size:15px">${esc(greeting)}</p>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${p}</p>`).join('\n')}
${button ? `<p style="margin:20px 0"><a href="${esc(button.url)}" style="background:#1d5fbf;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600;display:inline-block">${esc(button.label)}</a></p>` : ''}
<p style="margin:24px 0 0;font-size:12px;color:#6b7280">${esc(footer)}</p>
</td></tr></table></td></tr></table></body></html>`
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  const text = [greeting, '', ...paragraphs.map(strip), ...(button ? ['', `${button.label}: ${button.url}`] : []), '', footer].join('\n')
  return { subject, html, text }
}

const short = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`)

export interface Delivery {
  email: SendResult | null
  sms: SendResult | null
}

interface Recipient {
  name: string
  email: string
  phone?: string | null
  emailNotifications?: boolean
  smsNotifications?: boolean
}

/** Sends the email and/or SMS to one person. `always` ignores their preferences (account details, password resets). */
async function deliver(to: Recipient, message: { email?: Email; sms?: string }, always = false): Promise<Delivery> {
  const wantsEmail = Boolean(message.email) && (always || to.emailNotifications !== false)
  const wantsSms = Boolean(message.sms && to.phone) && (always || to.smsNotifications !== false)
  const [e, s] = await Promise.all([
    wantsEmail ? sendEmail(to.email, message.email!.subject, message.email!.html, message.email!.text) : null,
    wantsSms ? sendSms(to.phone!, message.sms!) : null,
  ])
  return { email: e, sms: s }
}

// --- New account sign-in details ---------------------------------------------------------------

export async function sendAccountDetails(account: { name: string; email: string; role: string; phone?: string | null }, tempPassword: string, schoolName: string): Promise<Delivery> {
  const login = `${appUrl()}/login`
  return deliver(account, {
    email: email(`Your Sangyin AI account at ${schoolName}`, `Hello ${account.name},`, [
      `An account has been created for you as a <strong>${esc(ROLE_NAME[account.role] ?? account.role)}</strong> at ${esc(schoolName)}.`,
      `Email: <strong>${esc(account.email)}</strong><br>One-time password: <strong style="font-family:Consolas,monospace">${esc(tempPassword)}</strong>`,
      'Sign in, then choose a new password in <strong>Settings → Security</strong>. Keep this email private.',
    ], { label: 'Sign in to Sangyin AI', url: login }, 'You are receiving this because your school created a Sangyin AI account for you.'),
    sms: `Sangyin AI: your ${ROLE_NAME[account.role] ?? account.role} account at ${short(schoolName, 30)} is ready. Email: ${account.email} One-time password: ${tempPassword} Sign in at ${login} and change it in Settings.`,
  }, true)
}

// --- Forgot password ------------------------------------------------------------------------------

export async function sendPasswordReset(user: { name: string; email: string }, token: string): Promise<Delivery> {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`
  return deliver(user, {
    email: email('Reset your Sangyin AI password', `Hello ${user.name},`, [
      'Someone (hopefully you) asked to reset the password for your Sangyin AI account.',
      'The link below works once and expires in 30 minutes. If you did not ask for this, you can ignore this email; your password stays the same.',
    ], { label: 'Choose a new password', url: link }),
  }, true)
}

// --- Parent updates ---------------------------------------------------------------------------------

/**
 * Tells a child's parents about something new (practice sent with "share with parents", or an approved guidance plan):
 * an in-app notification for each parent with an account, plus an email and a short SMS if they want them.
 * Runs in the background; returns how many parents were told.
 */
export async function notifyParents(studentIds: string[], update: { title: string; focus: string; note: string; link?: string }): Promise<number> {
  const links = await prisma.studentGuardian.findMany({
    where: { studentId: { in: studentIds } },
    include: { student: { select: { name: true } }, guardian: true },
  })
  for (const { student, guardian } of links) {
    const firstName = student.name.split(/\s+/)[0] ?? student.name
    await prisma.notification.create({
      data: { userId: guardian.id, kind: 'parent_communication', title: `${firstName}: ${update.title}`, body: update.note, link: update.link ?? '/parent/home-support' },
    })
    void deliver(guardian, {
      email: email(`${firstName} is working on ${update.focus}`, `Hello ${guardian.name},`, [
        `${esc(student.name)} is working on <strong>${esc(update.focus)}</strong>.`,
        esc(update.note),
      ], { label: 'Open Sangyin AI', url: `${appUrl()}${update.link ?? '/parent/home-support'}` }, 'You are receiving this because you are linked to a learner on Sangyin AI. You can turn these emails off in Settings.'),
      sms: short(`Sangyin AI: ${firstName} is working on ${update.focus}. ${update.note}`, 300),
    })
  }
  return links.length
}

// --- Notification copies ---------------------------------------------------------------------------------

/** Creates in-app notifications for these users and emails each a copy (if they want email). Runs in the background. */
export async function notifyUsers(userIds: string[], note: { kind: string; title: string; body: string; link?: string }): Promise<void> {
  if (!userIds.length) return
  await prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, kind: note.kind, title: note.title, body: note.body, link: note.link ?? null })) })
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } })
  for (const user of users) {
    void deliver(user, {
      email: email(note.title, `Hello ${user.name},`, [esc(note.body)], note.link ? { label: 'Open in Sangyin AI', url: `${appUrl()}${note.link}` } : undefined, 'You can turn these emails off in Settings → Notifications.'),
    })
  }
}
