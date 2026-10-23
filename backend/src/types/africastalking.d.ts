// Africa's Talking ships without TypeScript types; channels.ts describes the parts Sangyin uses.
declare module 'africastalking' {
  const africastalking: (options: { apiKey: string; username: string }) => unknown
  export default africastalking
}
