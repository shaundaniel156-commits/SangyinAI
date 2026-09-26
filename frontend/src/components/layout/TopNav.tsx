import { ChevronDown, Menu, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { cn } from '../../lib/cn'
import { NAVIGATION, type NavGroup, type NavItem } from '../../routes/navigation'
import { Logo } from './Logo'
import { NotificationMenu } from './NotificationMenu'
import { UserMenu } from './UserMenu'
import { usePopover } from './usePopover'

const isActivePath = (pathname: string, to: string) => pathname === to || pathname.startsWith(to + '/')

/**
 * Horizontal primary navigation. Always dark (the `dark` class scopes the dark tokens to this bar),
 * matching the photo hero beneath it. Unlabelled groups render as links, labelled groups as dropdowns.
 * The Account group is left out: notifications have their own bell here, settings live in the user menu.
 */
export function TopNav({ onOpenNav }: { onOpenNav: () => void }) {
  const { role } = useSession()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const staff = role === 'teacher' || role === 'admin'
  const groups = NAVIGATION[role].filter((g) => g.label !== 'Account')

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/students?q=${encodeURIComponent(q)}` : '/students')
  }

  return (
    <header className="dark no-print sticky top-0 z-30 border-b border-white/10 bg-[#050a17]/80 text-ink backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNav}
          className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-3 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <Logo inverted showSubtitle={false} />

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {groups.map((g, gi) =>
            g.label ? <NavDropdown key={gi} group={g} /> : g.items.map((item) => <TopLink key={item.to} item={item} />),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {staff && (
            <form onSubmit={onSearch} role="search" className="relative hidden xl:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students…"
                aria-label="Search students"
                className="h-9 w-52 rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </form>
          )}
          <NotificationMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

function TopLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'text-white after:absolute after:inset-x-3 after:-bottom-3.25 after:h-0.5 after:rounded-full after:bg-linear-to-r after:from-brand-400 after:to-cyan-400 after:shadow-[0_0_12px_rgb(34_199_232/0.7)] after:transition-all' : 'text-ink-2 hover:bg-white/5 hover:text-white',
        )
      }
    >
      {item.label}
    </NavLink>
  )
}

function NavDropdown({ group }: { group: NavGroup }) {
  const { pathname } = useLocation()
  const { open, setOpen, ref } = usePopover()
  const active = group.items.some((i) => isActivePath(pathname, i.to))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'relative flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active ? 'text-white after:absolute after:inset-x-3 after:-bottom-3.25 after:h-0.5 after:rounded-full after:bg-linear-to-r after:from-brand-400 after:to-cyan-400 after:shadow-[0_0_12px_rgb(34_199_232/0.7)] after:transition-all' : 'text-ink-2 hover:bg-white/5 hover:text-white',
        )}
      >
        {group.label}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-40 mt-3 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-2xl">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
                )
              }
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}
