/**
 * DEMO DATA — placeholder school used throughout the prototype.
 * Not a real institution. Replace with the school configuration API later.
 */
export const DEMO_SCHOOL = {
  name: 'Demo School',
  type: 'Primary & Lower Secondary (Demo)',
  location: 'Demo District, Uganda',
  primaryFramework: 'uganda' as const,
  academicYear: '2026',
  currentTerm: 'Term 3',
  termOptions: ['Term 1, 2026', 'Term 2, 2026', 'Term 3, 2026'],
  contactEmail: 'office@demo-school.example',
}

/** Placeholder sync timestamp shown in the offline/sync indicator. */
export const DEMO_LAST_SYNCED = 'Today, 10:42 AM'

/** Number of locally queued changes shown while offline (UI state only). */
export const DEMO_PENDING_SYNC_ITEMS = 3
