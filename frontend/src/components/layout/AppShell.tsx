import { CloudOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useConnectivity } from '../../context/ConnectivityContext'
import { useSession } from '../../context/SessionContext'
import { cn } from '../../lib/cn'
import { Drawer } from '../ui/Modal'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

/** Application shell: top navigation + routed content. */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()
  const { role } = useSession()
  const { status, pendingItems } = useConnectivity()
  const portal = role === 'parent' || role === 'student'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      {/* Small screens: the full sidebar opens as a drawer from the top bar's menu button */}
      <Drawer open={navOpen} onClose={() => setNavOpen(false)} title="Navigation" side="left" bare>
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </Drawer>
      <TopNav onOpenNav={() => setNavOpen(true)} />
      {status === 'offline' && (
        <div role="status" className="no-print flex items-center gap-2 border-b border-line bg-surface-3 px-4 py-2 text-sm text-ink-2 sm:px-6">
          <CloudOff className="size-4 shrink-0" aria-hidden />
          <span>
            You’re offline. Your work is saved on this device and will sync when a connection is available
            {pendingItems > 0 && ` (${pendingItems} changes waiting)`}.
          </span>
        </div>
      )}
      <main id="main" className={cn('mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12', portal && 'pb-24 lg:pb-12')}>
        <Outlet />
      </main>
      {portal && <MobileNav />}
    </div>
  )
}
