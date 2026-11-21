import { emailProvider, sendEmail } from '../src/messaging/channels.ts'
import { gmailPort, gmailUser } from '../src/messaging/gmail.ts'

// Sends one short test email through whichever sender is set up in .env (a Gmail account, or Resend), and says
// whether it went. The password and key are never shown.
//
//   npm run email -- someone@example.com
//   npm run email                          (with Gmail: sends to the Gmail account itself)

const provider = emailProvider()
if (!provider) {
  console.log('No email sender is set up. In backend/.env, fill in GMAIL_USER and GMAIL_APP_PASSWORD (or RESEND_API_KEY) and run this again.')
  process.exit(1)
}
const to = process.argv[2]?.trim() || (provider === 'gmail' ? gmailUser() : '')
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.log('Usage: npm run email -- someone@example.com')
  if (provider === 'resend') console.log('(Until a domain is verified, Resend only delivers to the address of the Resend account itself.)')
  process.exit(1)
}

console.log(`Sending a test email through ${provider === 'gmail' ? `Gmail (${gmailUser()})` : 'Resend'} to ${to}…\n`)
const text = 'This is a test email from Sangezi Academia. If you can read it, the server can send email.'
const result = await sendEmail(to, 'Sangezi Academia test email', `<p>${text}</p>`, text)
if (result.sent) {
  console.log(`\nPASS: the email was handed over by ${provider}${provider === 'gmail' ? ` on port ${gmailPort()}` : ''}. Check the inbox of ${to} (and its spam folder).`)
  process.exit(0)
}
console.log(`\nFAIL (${provider}): ${result.error}`)
if (provider === 'gmail' && /did not accept the sign-in/.test(result.error ?? '')) {
  console.log(`
Check each of these:
  1. The app password was created while signed in to the same Google account as GMAIL_USER (${gmailUser()}).
  2. 2-Step Verification is turned on for that account (app passwords stop working if it is turned off).
  3. The 16 letters were copied and pasted, not typed, and all 16 are there.
  4. It is the app password, not the account's normal password.
If in doubt, delete the app password in the Google account, create a new one, and paste that.`)
}
process.exit(1)
