import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { ROLE_LABEL } from '../../data/users'
import { Avatar } from '../ui/Avatar'
import { usePopover } from './usePopover'

export function UserMenu() {
  const { user, role, signOut } = useSession()
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
