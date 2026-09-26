import { Navigate } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { ROLE_HOME } from '../../data/users'
import { AdminDashboard } from '../admin/AdminDashboard'
import { TeacherDashboard } from '../teacher/TeacherDashboard'

/** /dashboard renders the staff dashboard for the active role. */
export function DashboardPage() {
  const { role } = useSession()
  if (role === 'teacher') return <TeacherDashboard />
  if (role === 'admin') return <AdminDashboard />
  return <Navigate to={ROLE_HOME[role]} replace />
}
