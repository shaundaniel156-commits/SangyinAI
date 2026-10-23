/**
 * Whether the data modules currently hold data loaded from the backend (set by lib/liveData.ts after
 * sign-in), and when it was last loaded. When active, lists are already limited to what the signed-in
 * user may see, so the scope helpers don't filter them again.
 */
export const liveState: { active: boolean; loadedAt: Date | null } = { active: false, loadedAt: null }
