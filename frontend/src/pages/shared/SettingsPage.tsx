import { Bell, BookOpenCheck, Building2, Languages, LockKeyhole, Palette, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSession } from '../../context/SessionContext'
import type { Role } from '../../types'
import { AppearanceSection } from './components/settings/AppearanceSection'
import { CurriculumSection } from './components/settings/CurriculumSection'
import { LanguageSection } from './components/settings/LanguageSection'
import { NotificationPrefsSection } from './components/settings/NotificationPrefsSection'
import { PrivacySection } from './components/settings/PrivacySection'
import { ProfileSection } from './components/settings/ProfileSection'
import { SchoolSection } from './components/settings/SchoolSection'
import { SecuritySection } from './components/settings/SecuritySection'
import { SettingsNav, type SettingsNavItem } from './components/settings/SettingsNav'

type SectionId = 'profile' | 'school' | 'curriculum' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'security'

const SECTIONS: (SettingsNavItem<SectionId> & { roles: Role[]; component: ComponentType })[] = [
  { id: 'profile', label: 'Profile', icon: UserRound, roles: ['teacher', 'admin', 'parent', 'student'], component: ProfileSection },
  { id: 'school', label: 'School information', icon: Building2, roles: ['admin'], component: SchoolSection },
  { id: 'curriculum', label: 'Curriculum framework', icon: BookOpenCheck, roles: ['teacher', 'admin'], component: CurriculumSection },
  { id: 'notifications', label: 'Notification preferences', icon: Bell, roles: ['teacher', 'admin', 'parent', 'student'], component: NotificationPrefsSection },
  { id: 'privacy', label: 'Privacy & data', icon: LockKeyhole, roles: ['teacher', 'admin', 'parent', 'student'], component: PrivacySection },
  { id: 'appearance', label: 'Appearance', icon: Palette, roles: ['teacher', 'admin', 'parent', 'student'], component: AppearanceSection },
  { id: 'language', label: 'Language', icon: Languages, roles: ['teacher', 'admin', 'parent', 'student'], component: LanguageSection },
  { id: 'security', label: 'Security', icon: ShieldCheck, roles: ['teacher', 'admin', 'parent', 'student'], component: SecuritySection },
]

export function SettingsPage() {
  const { role } = useSession()
  const sections = SECTIONS.filter((s) => s.roles.includes(role))
  const [active, setActive] = useState<SectionId>('profile')
  const current = sections.find((s) => s.id === active) ?? sections[0]!
  const Section = current.component
  const personal = role === 'parent' || role === 'student'

  return (
    <>
      <PageHeader
        title={personal ? 'Profile & Settings' : 'Settings'}
        description={personal ? 'Your details and how the app works for you.' : 'Manage your account and preferences.'}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SettingsNav items={sections} value={current.id} onChange={setActive} />
        </aside>
        <div className="min-w-0 max-w-3xl" key={current.id}>
          <Section />
        </div>
      </div>
    </>
  )
}
