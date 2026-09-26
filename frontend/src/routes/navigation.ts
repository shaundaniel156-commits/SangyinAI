import {
  Bell,
  BookOpenCheck,
  Building2,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Library,
  LineChart,
  type LucideIcon,
  MessageSquareText,
  PencilRuler,
  School,
  Settings,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  UserCog,
  Users,
  Wand2,
} from 'lucide-react'
import type { Role } from '../types'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Show in the mobile bottom bar (parent & student). */
  mobile?: boolean
  /** Short label for the mobile bottom bar. */
  mobileLabel?: string
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

const NOTIFICATIONS: NavItem = { label: 'Notifications', to: '/notifications', icon: Bell }
const SETTINGS: NavItem = { label: 'Settings', to: '/settings', icon: Settings }

/** Role-aware navigation. Each role only sees the areas specified for it. */
export const NAVIGATION: Record<Role, NavGroup[]> = {
  teacher: [
    { items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
    {
      label: 'Learners',
      items: [
        { label: 'Students', to: '/students', icon: GraduationCap },
        { label: 'Classes', to: '/classes', icon: Users },
      ],
    },
    {
      label: 'Assessment & insight',
      items: [
        { label: 'Assessments', to: '/assessments', icon: ClipboardList },
        { label: 'Performance', to: '/performance', icon: LineChart },
        { label: 'Diagnostics', to: '/diagnostics', icon: Stethoscope },
        { label: 'AI Guidance', to: '/guidance', icon: Sparkles },
        { label: 'AI Assessment Builder', to: '/ai-assessments', icon: Wand2 },
      ],
    },
    {
      label: 'Planning',
      items: [
        { label: 'Curriculum', to: '/curriculum', icon: Library },
        { label: 'Reports', to: '/reports', icon: FileBarChart2 },
      ],
    },
    { label: 'Account', items: [NOTIFICATIONS, SETTINGS] },
  ],
  admin: [
    { items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
    {
      label: 'School',
      items: [
        { label: 'Academic Structure', to: '/admin/structure', icon: Building2 },
        { label: 'Users', to: '/admin/users', icon: UserCog },
        { label: 'Teachers', to: '/admin/teachers', icon: School },
        { label: 'Students', to: '/students', icon: GraduationCap },
        { label: 'Classes', to: '/classes', icon: Users },
      ],
    },
    {
      label: 'Academics',
      items: [
        { label: 'Curriculum', to: '/curriculum', icon: Library },
        { label: 'Reports', to: '/reports', icon: FileBarChart2 },
      ],
    },
    { label: 'Account', items: [NOTIFICATIONS, SETTINGS] },
  ],
  parent: [
    {
      items: [
        { label: 'Dashboard', to: '/parent/dashboard', icon: Home, mobile: true, mobileLabel: 'Home' },
        { label: 'My Children', to: '/parent/children', icon: Users },
        { label: 'Progress', to: '/parent/progress', icon: TrendingUp, mobile: true },
        { label: 'Current Learning Focus', to: '/parent/focus', icon: Target, mobile: true, mobileLabel: 'Focus' },
        { label: 'Home Support', to: '/parent/home-support', icon: HeartHandshake, mobile: true, mobileLabel: 'Help' },
      ],
    },
    {
      label: 'Account',
      items: [
        { ...NOTIFICATIONS, mobile: true, mobileLabel: 'Alerts' },
        { label: 'Profile & Settings', to: '/settings', icon: Settings },
      ],
    },
  ],
  student: [
    {
      items: [
        { label: 'Dashboard', to: '/student/dashboard', icon: Home, mobile: true, mobileLabel: 'Home' },
        { label: 'My Learning', to: '/student/learning', icon: BookOpenCheck, mobile: true, mobileLabel: 'Learning' },
        { label: 'Practice', to: '/student/practice', icon: PencilRuler, mobile: true },
        { label: 'Progress', to: '/student/progress', icon: TrendingUp, mobile: true },
        { label: 'Feedback', to: '/student/feedback', icon: MessageSquareText },
      ],
    },
    {
      label: 'Account',
      items: [
        { ...NOTIFICATIONS, mobile: true, mobileLabel: 'Alerts' },
        { label: 'Profile & Settings', to: '/settings', icon: Settings },
      ],
    },
  ],
}

/** Page titles for routes not directly listed in the navigation. */
const EXTRA_TITLES: { prefix: string; title: string }[] = [
  { prefix: '/students/', title: 'Student Profile' },
  { prefix: '/classes/', title: 'Class Details' },
  { prefix: '/assessments/new', title: 'Create Assessment' },
  { prefix: '/assessments/import', title: 'Import Results' },
  { prefix: '/assessments/', title: 'Assessment Details' },
  { prefix: '/diagnostics/', title: 'Diagnostic Report' },
  { prefix: '/guidance/', title: 'Guidance Review' },
  { prefix: '/ai-assessments/new', title: 'Generate Assessment' },
  { prefix: '/ai-assessments/', title: 'Review AI Assessment' },
]

export function titleForPath(role: Role, pathname: string): string {
  const extra = EXTRA_TITLES.find((e) => pathname.startsWith(e.prefix))
  if (extra) return extra.title
  for (const group of NAVIGATION[role]) {
    for (const item of group.items) {
      if (pathname === item.to || pathname.startsWith(item.to + '/')) return item.label
    }
  }
  return 'Sangyin AI'
}
