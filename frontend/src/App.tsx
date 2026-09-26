import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { SplashScreen } from './components/layout/SplashScreen'
import { LandingPage } from './pages/auth/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/shared/DashboardPage'
import { NotFoundPage } from './pages/shared/NotFoundPage'
import { CurriculumPage } from './pages/staff/CurriculumPage'
import { AiAssessmentNewPage } from './pages/staff/ai/AiAssessmentNewPage'
import { AiAssessmentReviewPage } from './pages/staff/ai/AiAssessmentReviewPage'
import { AiAssessmentsPage } from './pages/staff/ai/AiAssessmentsPage'
import { ReportsPage } from './pages/staff/ReportsPage'
import { PerformancePage } from './pages/staff/PerformancePage'
import { DiagnosticsPage } from './pages/staff/DiagnosticsPage'
import { DiagnosticDetailPage } from './pages/staff/DiagnosticDetailPage'
import { GuidancePage } from './pages/staff/GuidancePage'
import { GuidanceDetailPage } from './pages/staff/GuidanceDetailPage'
import { AcademicStructurePage } from './pages/admin/AcademicStructurePage'
import { UsersPage } from './pages/admin/UsersPage'
import { TeachersPage } from './pages/admin/TeachersPage'
import { NotificationsPage } from './pages/shared/NotificationsPage'
import { SettingsPage } from './pages/shared/SettingsPage'
import { ParentDashboard } from './pages/parent/ParentDashboard'
import { ParentChildrenPage } from './pages/parent/ParentChildrenPage'
import { ParentProgressPage } from './pages/parent/ParentProgressPage'
import { ParentFocusPage } from './pages/parent/ParentFocusPage'
import { ParentHomeSupportPage } from './pages/parent/ParentHomeSupportPage'
import { StudentDashboard } from './pages/student/StudentDashboard'
import { StudentLearningPage } from './pages/student/StudentLearningPage'
import { StudentPracticePage } from './pages/student/StudentPracticePage'
import { StudentProgressPage } from './pages/student/StudentProgressPage'
import { StudentFeedbackPage } from './pages/student/StudentFeedbackPage'
import { AssessmentDetailPage } from './pages/staff/AssessmentDetailPage'
import { AssessmentsPage } from './pages/staff/AssessmentsPage'
import { ClassDetailPage } from './pages/staff/ClassDetailPage'
import { ClassesPage } from './pages/staff/ClassesPage'
import { CreateAssessmentPage } from './pages/staff/CreateAssessmentPage'
import { ImportResultsPage } from './pages/staff/ImportResultsPage'
import { StudentProfilePage } from './pages/staff/StudentProfilePage'
import { StudentsPage } from './pages/staff/StudentsPage'

/**
 * Application routes. No authentication guards exist yet (prototype phase);
 * the demo session only decides which role's navigation and dashboards show.
 */
export default function App() {
  return (
    <>
    <SplashScreen />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentProfilePage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:id" element={<ClassDetailPage />} />
        <Route path="/assessments" element={<AssessmentsPage />} />
        <Route path="/assessments/new" element={<CreateAssessmentPage />} />
        <Route path="/assessments/import" element={<ImportResultsPage />} />
        <Route path="/assessments/:id" element={<AssessmentDetailPage />} />
        <Route path="/ai-assessments" element={<AiAssessmentsPage />} />
        <Route path="/ai-assessments/new" element={<AiAssessmentNewPage />} />
        <Route path="/ai-assessments/:id" element={<AiAssessmentReviewPage />} />
        <Route path="/curriculum" element={<CurriculumPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        <Route path="/diagnostics/:id" element={<DiagnosticDetailPage />} />
        <Route path="/guidance" element={<GuidancePage />} />
        <Route path="/guidance/:id" element={<GuidanceDetailPage />} />
        <Route path="/admin/structure" element={<AcademicStructurePage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/teachers" element={<TeachersPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/parent/dashboard" element={<ParentDashboard />} />
        <Route path="/parent/children" element={<ParentChildrenPage />} />
        <Route path="/parent/progress" element={<ParentProgressPage />} />
        <Route path="/parent/focus" element={<ParentFocusPage />} />
        <Route path="/parent/home-support" element={<ParentHomeSupportPage />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/learning" element={<StudentLearningPage />} />
        <Route path="/student/practice" element={<StudentPracticePage />} />
        <Route path="/student/progress" element={<StudentProgressPage />} />
        <Route path="/student/feedback" element={<StudentFeedbackPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </>
  )
}
