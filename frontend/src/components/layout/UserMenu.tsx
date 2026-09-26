import { Check, ChevronDown, LogOut, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { ROLE_HOME, ROLE_LABEL } from '../../data/users'
import { cn } from '../../lib/cn'
import type { Role } from '../../types'
import { Avatar } from '../ui/Avatar'
import { usePopover } from './usePopover'

const ROLES: Role[] = ['teacher', 'admin', 'parent', 'student']

export function UserMenu() {
  const { user, role, switchRole, signOut } = useSession()
  const { open, setOpen, ref } = usePopover()
  const navigate = useNavigate()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-surface-3"
      >
        <Avatar initials={user.initials} size="sm" />
        <span className="hidden text-left leading-tight md:block">
          <span className="block whitespace-nowrap text-sm font-medium text-ink">{user.name}</span>
          <span className="block whitespace-nowrap text-xs text-ink-3">{ROLE_LABEL[role]}</span>
        </span>
        <ChevronDown className="hidden size-4 text-ink-3 md:block" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-3">{user.email}</p>
          </div>
          <div className="border-b border-line px-2 py-2">
            <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">View as (demo)</p>
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                role="menuitemradio"
                aria-checked={r === role}
                onClick={() => {
                  switchRole(r)
                  setOpen(false)
                  navigate(ROLE_HOME[r])
                }}
                className={cn('flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-surface-3', r === role ? 'text-brand-ink' : 'text-ink-2')}
              >
                {ROLE_LABEL[r]}
                {r === role && <Check className="size-4" aria-hidden />}
              </button>
            ))}
          </div>
          <div className="px-2 py-2">
            <Link to="/settings" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-3">
              <Settings className="size-4" aria-hidden />
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                signOut()
                navigate('/login')
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-3"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
