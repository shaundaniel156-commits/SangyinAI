/** Diagnostic reports, loaded from the backend after sign-in (lib/liveData.ts fills the list in place). */
import type { DiagnosticReport } from '../types'

export const DIAGNOSTIC_REPORTS: DiagnosticReport[] = []

export function getDiagnostic(id: string): DiagnosticReport | undefined {
  return DIAGNOSTIC_REPORTS.find((d) => d.id === id)
}

export function getDiagnosticForStudent(studentId: string): DiagnosticReport | undefined {
  return DIAGNOSTIC_REPORTS.find((d) => d.studentId === studentId)
}
