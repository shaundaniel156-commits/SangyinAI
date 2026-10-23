/** Every account in the school, for the administrator's Users page (loaded by lib/liveData.ts). */
import type { Role } from '../types'

export type AccountStatus = 'active' | 'invited' | 'inactive'

export interface UserAccount {
  id: string
  name: string
  initials: string
  email: string
  role: Role
  status: AccountStatus
  /** When they last signed in (ISO), for the usage figures. */
  lastActiveAt?: string
  /** Short context line, e.g. linked class or child. */
  detail: string
  lastActive: string
}

export const USER_ACCOUNTS: UserAccount[] = []
