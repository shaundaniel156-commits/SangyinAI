import africastalking from 'africastalking'
import { Resend } from 'resend'
import { gmailConfigured, sendWithGmail } from './gmail.ts'

// Email (a Gmail account, or Resend) and SMS (Africa's Talking): the one place the whole app sends from. Both are optional: without
// keys in .env, a message is skipped, logged, and reported as not sent (never as sent). A failed send is logged
// and never breaks the action that triggered it.

export interface SendResult {
  sent: boolean
  /** Why not, in plain words. */
  error?: string
  /** True when it is the number itself that cannot be texted (not a real mobile number, or it has blocked us), rather than the service. */
  numberRefused?: boolean
}

// Addresses and numbers are masked in the log ("j***@gmail.com", "+256…456"), and a message's text is never
// logged: it can carry a one-time password or a reset link.
export const maskEmail = (email: string) => email.replace(/^(.).*?(@.*)$/, '$1***$2')
export const maskPhone = (phone: string) => `${phone.slice(0, 4)}…${phone.slice(-3)}`

let resend: Resend | undefined
const resendKey = () => process.env.RESEND_API_KEY?.trim() ?? ''
// A subject as it is written to the log: it can carry a school's name, so anything that is not printable
// (a line break, say) is taken out, and it cannot start a line of its own there.
const shown = (subject: string) => subject.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ')
// Who emails come from: RESEND_FROM, or the older EMAIL_FROM, or Resend's test sender.
const emailFrom = () => process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Sangezi Academia <onboarding@resend.dev>'
// The name shown as the sender, taken from that setting ("Sangezi Academia <…>").
const fromName = () => /^\s*"?([^"<]*?)"?\s*<[^>]+>\s*$/.exec(emailFrom())?.[1]?.trim() || 'Sangezi Academia'

/**
 * Which service sends email: a Gmail account (GMAIL_USER and GMAIL_APP_PASSWORD, see messaging/gmail.ts) when
 * both are set, otherwise Resend (RESEND_API_KEY), otherwise none. With both set up, EMAIL_PROVIDER picks one.
 */
export function emailProvider(): 'gmail' | 'resend' | null {
  const resendReady = Boolean(resendKey())
  const asked = process.env.EMAIL_PROVIDER?.trim().toLowerCase()
  if (asked === 'resend' && resendReady) return 'resend'
  if (asked === 'gmail' && gmailConfigured()) return 'gmail'
  return gmailConfigured() ? 'gmail' : resendReady ? 'resend' : null
}

/** True when the server can send email, by either service. Everything that needs to know asks here. */
export function emailConfigured(): boolean {
  return emailProvider() !== null
}

/** Sends one email. Never throws. */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  const provider = emailProvider()
  if (!provider) {
    console.log(`[email] skipped "${shown(subject)}" to ${maskEmail(to)}: email is not set up (GMAIL_USER and GMAIL_APP_PASSWORD, or RESEND_API_KEY)`)
    return { sent: false, error: 'Email is not set up yet on the server.' }
  }
  if (provider === 'gmail') {
    // The sender's address is always the Gmail account's own (Gmail replaces any other); only the name is ours.
    const result = await sendWithGmail(to, subject, html, text, fromName())
    if (result.sent) console.log(`[email] sent "${shown(subject)}" to ${maskEmail(to)} (gmail, ${result.detail})`)
    else console.error(`[email] "${shown(subject)}" to ${maskEmail(to)} failed (gmail, ${result.detail})`)
    return result.sent ? { sent: true } : { sent: false, error: result.error }
  }
  try {
    resend ??= new Resend(resendKey())
    const { error } = await resend.emails.send({ from: emailFrom(), to, subject, html, text })
    if (error) {
      console.error(`[email] "${shown(subject)}" to ${maskEmail(to)} failed: ${error.message}`)
      return { sent: false, error: error.message }
    }
    console.log(`[email] sent "${shown(subject)}" to ${maskEmail(to)} (resend)`)
    return { sent: true }
  } catch (error) {
    console.error(`[email] "${shown(subject)}" to ${maskEmail(to)} failed: ${(error as Error).message}`)
    return { sent: false, error: (error as Error).message }
  }
}

type SmsClient = { send: (options: { to: string[]; message: string; from?: string }) => Promise<{ SMSMessageData?: { Recipients?: { number: string; status: string; statusCode: number }[]; Message?: string } }> }
let sms: SmsClient | undefined
/** SMS needs only the Africa's Talking key; without AT_USERNAME, their sandbox is used. */
export function smsConfigured(): boolean {
  return Boolean(process.env.AT_API_KEY)
}
const smsUsername = () => process.env.AT_USERNAME || 'sandbox'
export function smsIsSandbox(): boolean {
  return smsUsername() === 'sandbox'
}

/**
 * A phone number in international form (+256…). Ugandan numbers written locally (0772 123456, 772123456) are
 * converted; anything else must already start with +. Returns null if it can't be used.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^\d+]/g, '')
  if (/^\+\d{9,15}$/.test(digits)) return digits
  if (/^256\d{9}$/.test(digits)) return `+${digits}`
  if (/^0\d{9}$/.test(digits)) return `+256${digits.slice(1)}`
  if (/^7\d{8}$/.test(digits)) return `+256${digits}`
  return null
}

/** Sends one SMS. Never throws. In the Africa's Talking sandbox, messages appear in their online simulator only. */
export async function sendSms(phone: string, message: string): Promise<SendResult> {
  const to = normalisePhone(phone)
  if (!to) return { sent: false, error: `Not a usable phone number: ${phone}` }
  if (!smsConfigured()) {
    console.log(`[sms] skipped to ${maskPhone(to)}: SMS is not set up (AT_API_KEY)`)
    return { sent: false, error: 'SMS is not set up yet on the server.' }
  }
  try {
    sms ??= (africastalking({ apiKey: process.env.AT_API_KEY!, username: smsUsername() }) as unknown as { SMS: SmsClient }).SMS
    const res = await sms.send({ to: [to], message, ...(process.env.AT_SENDER_ID ? { from: process.env.AT_SENDER_ID } : {}) })
    // Africa's Talking can accept the request and still refuse the number: its answer for this recipient decides.
    const recipient = res.SMSMessageData?.Recipients?.[0]
    const ok = recipient && recipient.statusCode >= 100 && recipient.statusCode < 200
    if (!ok) {
      const status = recipient?.status ?? res.SMSMessageData?.Message?.slice(0, 80) ?? 'no answer for this number'
      const numberRefused = /InvalidPhoneNumber|UnsupportedNumberType|CouldNotRoute|UserInBlacklist|DoNotDisturb/i.test(status)
      if (/InsufficientBalance/i.test(status)) console.warn('[sms] Africa’s Talking says INSUFFICIENT BALANCE: no text messages are going out until the account is topped up.')
      console.error(`[sms] to ${maskPhone(to)} failed: ${status}`)
      return { sent: false, error: smsRefusal(status), ...(numberRefused ? { numberRefused } : {}) }
    }
    console.log(`[sms] sent to ${maskPhone(to)}${smsIsSandbox() ? ' (sandbox: see the Africa’s Talking simulator)' : ''}`)
    return { sent: true }
  } catch (error) {
    // Only the reason: the full HTTP error carries request headers, including the API key.
    const reason = failureReason(error)
    console.error(`[sms] to ${maskPhone(to)} failed: ${reason}`)
    return { sent: false, error: reason }
  }
}

// What Africa's Talking said about one number, in plain words.
function smsRefusal(status: string): string {
  if (/InvalidPhoneNumber|UnsupportedNumberType|CouldNotRoute/i.test(status)) return 'That phone number cannot receive text messages. Check that it is a mobile number and typed correctly.'
  if (/UserInBlacklist|DoNotDisturb/i.test(status)) return 'That phone number has blocked text messages from this service.'
  if (/InsufficientBalance/i.test(status)) return 'Text messages cannot be sent right now (the text message account needs topping up).'
  return 'The text message service could not send the message right now.'
}

function failureReason(error: unknown): string {
  const res = (error as { response?: { status?: number; data?: unknown } }).response
  if (res?.status === 401) return 'Africa’s Talking rejected the username or API key (check AT_USERNAME and AT_API_KEY).'
  if (res) return `Africa’s Talking replied ${res.status}: ${typeof res.data === 'string' ? res.data.slice(0, 200) : 'request refused'}`
  return (error as Error).message ?? String(error)
}
