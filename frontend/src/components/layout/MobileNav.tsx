import { NavLink } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { cn } from '../../lib/cn'
import { NAVIGATION } from '../../routes/navigation'

/** Bottom tab bar for the parent and student interfaces on small screens. */
export function MobileNav() {
  const { role } = useSession()
  const items = NAVIGATION[role].flatMap((g) => g.items).filter((i) => i.mobile)
  if (!items.length) return null
  return (
    <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-1 py-2 text-[11px] font-medium', isActive ? 'text-brand-ink' : 'text-ink-3')
              }
            >
              <item.icon className="size-5" aria-hidden />
              {item.mobileLabel ?? item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
