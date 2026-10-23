import africastalking from 'africastalking'
import { Resend } from 'resend'

// Email (Resend) and SMS (Africa's Talking). Both are optional: without keys in .env, messages are logged and
// skipped. A failed send is logged and never breaks the action that triggered it.

export interface SendResult {
  sent: boolean
  error?: string
}

let resend: Resend | undefined
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

/** Sends one email. Never throws. */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  if (!emailConfigured()) {
    console.log(`[email] not configured — would have sent "${subject}" to ${to}`)
    return { sent: false, error: 'Email is not set up (RESEND_API_KEY, EMAIL_FROM).' }
  }
  try {
    resend ??= new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM!, to, subject, html, text })
    if (error) {
      console.error(`[email] "${subject}" to ${to} failed: ${error.message}`)
      return { sent: false, error: error.message }
    }
    console.log(`[email] sent "${subject}" to ${to}`)
    return { sent: true }
  } catch (error) {
    console.error(`[email] "${subject}" to ${to} failed: ${(error as Error).message}`)
    return { sent: false, error: (error as Error).message }
  }
}

type SmsClient = { send: (options: { to: string[]; message: string; from?: string }) => Promise<{ SMSMessageData?: { Recipients?: { number: string; status: string; statusCode: number }[]; Message?: string } }> }
let sms: SmsClient | undefined
export function smsConfigured(): boolean {
  return Boolean(process.env.AT_USERNAME && process.env.AT_API_KEY)
}
export function smsIsSandbox(): boolean {
  return process.env.AT_USERNAME === 'sandbox'
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
    console.log(`[sms] not configured — would have sent to ${to}: ${message}`)
    return { sent: false, error: 'SMS is not set up (AT_USERNAME, AT_API_KEY).' }
  }
  try {
    sms ??= (africastalking({ apiKey: process.env.AT_API_KEY!, username: process.env.AT_USERNAME! }) as unknown as { SMS: SmsClient }).SMS
    const res = await sms.send({ to: [to], message, ...(process.env.AT_SENDER_ID ? { from: process.env.AT_SENDER_ID } : {}) })
    const recipient = res.SMSMessageData?.Recipients?.[0]
    const ok = recipient && recipient.statusCode >= 100 && recipient.statusCode < 200
    if (!ok) {
      const reason = recipient?.status ?? res.SMSMessageData?.Message ?? 'unknown reason'
      console.error(`[sms] to ${to} failed: ${reason}`)
      return { sent: false, error: reason }
    }
    console.log(`[sms] sent to ${to}${smsIsSandbox() ? ' (sandbox: see the Africa’s Talking simulator)' : ''}`)
    return { sent: true }
  } catch (error) {
    // Only the reason: the full HTTP error carries request headers, including the API key.
    const reason = failureReason(error)
    console.error(`[sms] to ${to} failed: ${reason}`)
    return { sent: false, error: reason }
  }
}

function failureReason(error: unknown): string {
  const res = (error as { response?: { status?: number; data?: unknown } }).response
  if (res?.status === 401) return 'Africa’s Talking rejected the username or API key (check AT_USERNAME and AT_API_KEY).'
  if (res) return `Africa’s Talking replied ${res.status}: ${typeof res.data === 'string' ? res.data.slice(0, 200) : 'request refused'}`
  return (error as Error).message ?? String(error)
}
