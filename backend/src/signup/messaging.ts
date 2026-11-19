// TEMPORARY: testing-period sign-up. Delete this folder (backend/src/signup) when official users are onboarded.
// See the list of what else to remove at the top of signup/routes.ts.
//
// Sends the sign-up codes through the app's own senders (messaging/channels.ts, which stay): one code by email and
// a different one by SMS:
// - the email code is always asked for, so the email address is always proven. A live server without the Resend
//   key therefore has sign-up closed. On a developer's own computer with no Resend key the code is written to the
//   console instead, so the flow can still be finished;
// - the SMS code only with a live Africa's Talking account. Their sandbox delivers to an online simulator, not to
//   phones, so there the SMS is still sent (to be seen in the simulator) but its code is not asked for.
// The codes are never logged on a live server.

import { emailConfigured, maskEmail, sendEmail, sendSms, smsConfigured, smsIsSandbox, type SendResult } from '../messaging/channels.ts'

export const CODE_MINUTES = 10

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
// Render sets RENDER on its servers, so a live server counts as production even if NODE_ENV was left unset.
const isProduction = () => process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER)

/** Which codes a person must type in to finish: always the emailed one, and the texted one too with live SMS. */
export function signupNeeds(): { email: boolean; phone: boolean } {
  return { email: true, phone: smsConfigured() && !smsIsSandbox() }
}

/** False on a live server that cannot send email, whatever SMS can do: sign-up is then closed. */
export function signupUsable(): boolean {
  return emailConfigured() || !isProduction()
}

/**
 * Sends the email code and the SMS code. Never throws. Returns false when a code the person will be asked for
 * could not be sent, so the sign-up cannot go on.
 * alreadyRegistered: the email already has an account. Everything is done the same way, so the person asking
 * cannot tell, except that the email says "you already have an account" and carries no code.
 */
export async function sendSignupCodes(to: { name: string; email: string; phone: string }, codes: { email: string; phone: string }, alreadyRegistered = false): Promise<boolean> {
  const needs = signupNeeds()
  const hasEmail = emailConfigured()
  const hasSms = smsConfigured()
  // Local testing only: a code with no key to send it is shown here.
  if (!isProduction()) {
    if (!hasEmail) console.log(`[signup] LOCAL TESTING ONLY, no email key is set. Email code for ${maskEmail(to.email)}: ${codes.email}`)
    if (!hasSms) console.log(`[signup] LOCAL TESTING ONLY, no SMS key is set. Text-message code for ${maskEmail(to.email)}: ${codes.phone}`)
  }

  const note = `It works for ${CODE_MINUTES} minutes. If you did not ask for it, you can ignore this message.`
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#1f4e79;letter-spacing:.3px">SANGEZI ACADEMIA</p>
<p style="margin:0 0 12px;font-size:15px">Hello ${esc(to.name)},</p>
<p style="margin:0 0 12px;font-size:15px">Enter this code to finish creating your account:</p>
<p style="margin:16px 0;font-size:30px;font-weight:700;letter-spacing:6px;font-family:Consolas,monospace">${codes.email}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${esc(note)}</p>
</td></tr></table></td></tr></table></body></html>`
  const text = [`Hello ${to.name},`, '', `Your Sangezi Academia sign-up code is ${codes.email}.`, note].join('\n')

  // The senders log what happened to each message (addresses masked, never the text).
  const [email, sms] = await Promise.all([
    !hasEmail ? null : alreadyRegistered ? sendAlreadyRegistered(to) : sendEmail(to.email, 'Your Sangezi Academia sign-up code', html, text),
    hasSms ? sendSms(to.phone, `Sangezi Academia: your sign-up code is ${codes.phone}. It works for ${CODE_MINUTES} minutes. Do not share it.`) : null,
  ])
  const emailOk = !hasEmail || Boolean(email?.sent)
  const smsOk = !needs.phone || Boolean(sms?.sent)
  return emailOk && smsOk
}

/**
 * Someone tried to sign up with an email that already has an account. They are told so by email only, so the
 * sign-up page gives the same reply either way and cannot be used to find out which emails have accounts.
 */
function sendAlreadyRegistered(to: { name: string; email: string }): Promise<SendResult> {
  const appUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
  const lines = [
    'Someone (hopefully you) tried to create a Sangezi Academia account with this email address, but it already has one.',
    `Sign in at ${appUrl}/login. If you have forgotten your password, choose "Forgot password?" there.`,
    'If this was not you, you can ignore this email; nothing has changed.',
  ]
  const html = `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937"><p>Hello ${esc(to.name)},</p>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</body></html>`
  return sendEmail(to.email, 'You already have a Sangezi Academia account', html, [`Hello ${to.name},`, '', ...lines].join('\n'))
}
