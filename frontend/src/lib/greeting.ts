/** "Good morning / afternoon / evening" from the viewer's local time. */
export function timeOfDayGreeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
