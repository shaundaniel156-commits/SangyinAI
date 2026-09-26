import { NavLink } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationsContext'
import { useSession } from '../../context/SessionContext'
import { DEMO_SCHOOL } from '../../data/school'
import { cn } from '../../lib/cn'
import { NAVIGATION } from '../../routes/navigation'
import { Logo } from './Logo'

interface SidebarProps {
  onNavigate?: () => void
}

/** Role-aware navigation panel. Rendered fixed on desktop and inside a drawer on small screens. */
export function Sidebar({ onNavigate }: SidebarProps) {
  const { role } = useSession()
  const { unreadCount } = useNotifications()
  return (
    <nav aria-label="Main" className="flex h-full flex-col bg-surface">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Logo />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAVIGATION[role].map((group, gi) => (
          <div key={gi}>
            {group.label && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-brand-600 dark:text-brand-300' : 'text-ink-3 group-hover:text-ink-2')} aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.to === '/notifications' && unreadCount > 0 && (
                          <span className="tabular rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{unreadCount}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-line px-5 py-4">
        <p className="text-xs font-medium text-ink">{DEMO_SCHOOL.name}</p>
        <p className="text-xs text-ink-3">
          {DEMO_SCHOOL.currentTerm}, {DEMO_SCHOOL.academicYear}
        </p>
      </div>
    </nav>
  )
}
