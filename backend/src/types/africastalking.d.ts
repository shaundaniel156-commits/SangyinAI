// Africa's Talking ships without TypeScript types; channels.ts describes the parts Sangezi Academia uses.
declare module 'africastalking' {
  const africastalking: (options: { apiKey: string; username: string }) => unknown
  export default africastalking
}
