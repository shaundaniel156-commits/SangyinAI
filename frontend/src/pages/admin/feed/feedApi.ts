import { API_URL, getAuthToken } from '../../../lib/api'

/** Types and helpers for the Manual feed (backend: /feed/*). */

export type FeedKindKey = 'curriculum' | 'questions' | 'classes' | 'students' | 'staff'

export interface FeedColumn {
  key: string
  header: string
  aliases?: string[]
  required?: boolean
  example: string
  help: string
}

export interface FeedKindInfo {
  key: FeedKindKey
  label: string
  description: string
  columns: FeedColumn[]
}

export interface CheckedRow {
  row: number
  values: Record<string, string>
  problems: string[]
}

export interface PreviewResult {
  kind: FeedKindKey
  columns: FeedColumn[]
  rows: CheckedRow[]
  ready: number
  problems: number
}

export interface NewAccount {
  name: string
  email: string
  role: string
  tempPassword: string
  /** Whether the sign-in details reached them (set by the server when it tried). */
  emailSent?: boolean
  smsSent?: boolean
  deliveryError?: string
}

export interface CommitResult {
  created: number
  updated: number
  skipped: number
  notes: string[]
  accounts?: NewAccount[]
  rejected: CheckedRow[]
}

/** Fixed choices for some columns, shown as dropdowns in forms. */
export const CHOICES: Record<string, { value: string; label: string }[]> = {
  type: [
    { value: 'multiple_choice', label: 'Multiple choice' },
    { value: 'short_answer', label: 'Short answer' },
  ],
  difficulty: [
    { value: 'foundation', label: 'Foundation' },
    { value: 'core', label: 'Core' },
    { value: 'stretch', label: 'Stretch' },
  ],
  framework: [
    { value: 'uganda', label: 'Uganda National Curriculum' },
    { value: 'cambridge', label: 'Cambridge International' },
    { value: 'institution', label: 'Own curriculum / university programme' },
  ],
  role: [
    { value: 'teacher', label: 'Teacher / lecturer' },
    { value: 'admin', label: 'Administrator' },
  ],
}

/** Downloads a file from the backend (with the sign-in token) and saves it. */
export async function downloadFromApi(path: string, filename: string): Promise<void> {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error(`Download failed (${res.status}).`)
  saveBlob(await res.blob(), filename)
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

/** New accounts and their one-time passwords as a CSV, to hand out. */
export function accountsCsv(accounts: NewAccount[]): Blob {
  const lines = [['Name', 'Email', 'Role', 'One-time password'], ...accounts.map((a) => [a.name, a.email, a.role, a.tempPassword])]
  return new Blob(['﻿' + lines.map((l) => l.map(cell).join(',')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })
}
