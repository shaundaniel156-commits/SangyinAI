// TEMPORARY: testing-period sign-up. Delete this folder (backend/src/signup) when official users are onboarded.
// See the list of what else to remove at the top of signup/routes.ts.
//
// Sends the sign-up code through the app's own senders (messaging/channels.ts, which stay): one code, by email or
// by text message (SMS), whichever the person chose. Which of the two can be chosen:
// - email, when the server can send email (a Gmail account or Resend);
// - text message, when Africa's Talking is set up with a live account. Their sandbox delivers to an online
//   simulator, not to phones, so on a live server it is offered only with SIGNUP_ALLOW_SANDBOX_SMS=true (for the
//   owner to try it), and the page then says so.
// On a developer's own computer, a way that is not set up is still offered and its code is written to the console,
// so the flow can be finished. A code is never logged on a live server.

import { emailConfigured, maskEmail, maskPhone, sendEmail, sendSms, smsConfigured, smsIsSandbox, type SendResult } from '../messaging/channels.ts'

export const CODE_MINUTES = 10
export type Channel = 'email' | 'sms'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
// Render sets RENDER on its servers, so a live server counts as production even if NODE_ENV was left unset.
const isProduction = () => process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER)
const sandboxAllowed = () => ['true', '1', 'on', 'yes'].includes((process.env.SIGNUP_ALLOW_SANDBOX_SMS ?? '').trim().toLowerCase())

/**
 * The ways a code can be sent right now. smsTest: text messages are offered on a live server but go to the
 * Africa's Talking simulator, not to phones (the page says so).
 */
export function signupChannels(): { email: boolean; sms: boolean; smsTest: boolean } {
  const live = isProduction()
  const sms = smsConfigured() ? !smsIsSandbox() || !live || sandboxAllowed() : !live
  return { email: emailConfigured() || !live, sms, smsTest: sms && live && smsConfigured() && smsIsSandbox() }
}

/** For the page: "s•••@gmail.com". */
export const hiddenEmail = (email: string) => email.replace(/^(.).*?(@.*)$/, '$1•••$2')
/** For the page and the notice email: "07•• ••• 432" for a Ugandan number, "+254 ••• ••• 432" for another. */
export function hiddenPhone(phone: string): string {
  const last = phone.slice(-3)
  return phone.startsWith('+256') ? `0${phone[4]}•• ••• ${last}` : `${phone.slice(0, 4)} ••• ••• ${last}`
}

// A plain email in the app's look: greeting, paragraphs (already safe HTML), and nothing else.
function letter(greeting: string, paragraphs: string[]): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#1f4e79;letter-spacing:.3px">SANGEZI ACADEMIA</p>
<p style="margin:0 0 12px;font-size:15px">${esc(greeting)}</p>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${p}</p>`).join('\n')}
</td></tr></table></td></tr></table></body></html>`
}

/**
 * Sends the code the chosen way. Never throws. Returns whether it went (on a developer's computer, a way that is
 * not set up counts as sent: the code is in the console).
 * alreadyRegistered: the email already has an account. By email, its owner is told so and gets no code; by text
 * message the code goes to the phone as usual (the sign-up still cannot be finished: signup/routes.ts). Either
 * way the person asking sees the same replies.
 */
export async function sendSignupCode(to: { name: string; email: string; phone: string }, channel: Channel, code: string, alreadyRegistered = false): Promise<SendResult> {
  if (channel === 'sms') {
    if (!smsConfigured()) {
      if (isProduction()) return { sent: false, error: 'SMS is not set up yet on the server.' }
      // Local testing only: with no SMS key, the code is shown here.
      console.log(`[signup] LOCAL TESTING ONLY, no SMS key is set. Text-message code for ${maskPhone(to.phone)}: ${code}`)
      return { sent: true }
    }
    // Under 160 plain characters: one text message.
    return sendSms(to.phone, `Sangezi Academia: your sign-up code is ${code}. It expires in ${CODE_MINUTES} minutes. Do not share it.`)
  }
  if (!emailConfigured()) {
    if (isProduction()) return { sent: false, error: 'Email is not set up yet on the server.' }
    console.log(`[signup] LOCAL TESTING ONLY, no email sender is set. Email code for ${maskEmail(to.email)}: ${code}`)
    return { sent: true }
  }
  if (alreadyRegistered) return sendAlreadyRegistered(to)
  const note = `It expires in ${CODE_MINUTES} minutes. If you did not ask for it, you can ignore this message.`
  const html = letter(`Hello ${to.name},`, [
    'Enter this code to finish creating your account:',
    `<span style="font-size:30px;font-weight:700;letter-spacing:6px;font-family:Consolas,monospace">${code}</span>`,
    esc(note),
  ])
  return sendEmail(to.email, 'Your Sangezi Academia sign-up code', html, [`Hello ${to.name},`, '', `Your Sangezi Academia sign-up code is ${code}.`, note].join('\n'))
}

/**
 * Someone tried to sign up with an email that already has an account. Its owner is told so by email, so the
 * sign-up page gives the same reply either way and cannot be used to find out which emails have accounts.
 */
export function sendAlreadyRegistered(to: { name: string; email: string }): Promise<SendResult> {
  const appUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
  const lines = [
    'Someone (hopefully you) tried to create a Sangezi Academia account with this email address, but it already has one.',
    `Sign in at ${appUrl}/login. If you have forgotten your password, choose "Forgot password?" there.`,
    'If this was not you, you can ignore this email; nothing has changed.',
  ]
  return sendEmail(to.email, 'You already have a Sangezi Academia account', letter(`Hello ${to.name},`, lines.map(esc)), [`Hello ${to.name},`, '', ...lines].join('\n'))
}

/**
 * An account was made with this email address by someone who proved a phone number, not the address. The
 * address is told, so its real owner knows and can take the account over. No code, and nothing that needs a reply.
 */
export function sendCreatedByPhone(to: { name: string; email: string; phone: string }): Promise<SendResult> {
  const appUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
  const lines = [
    `A Sangezi Academia account was created with this email address. The person confirmed it with a code sent by text message to the phone number ${hiddenPhone(to.phone)}.`,
    `If this was you, there is nothing to do: sign in at ${appUrl}/login.`,
    `If this was not you, the account is still under your email address and only you can reset its password: open ${appUrl}/login, choose "Forgot password?" and set a new one. That locks the other person out.`,
  ]
  return sendEmail(to.email, 'A Sangezi Academia account was created with your email address', letter(`Hello ${to.name},`, lines.map(esc)), [`Hello ${to.name},`, '', ...lines].join('\n'))
}
