import { cn } from '../../lib/cn'
import { ConnectivityIndicator } from './ConnectivityIndicator'

/** Floating online/offline dot in the bottom-left corner. Its status menu opens upwards. */
export function StatusDot({ aboveMobileNav = false }: { aboveMobileNav?: boolean }) {
  return (
    <div
      className={cn(
        'no-print fixed left-3 z-40 rounded-xl border border-line bg-surface/90 shadow-xl backdrop-blur sm:left-5',
        aboveMobileNav ? 'bottom-20 lg:bottom-5' : 'bottom-4 sm:bottom-5',
      )}
    >
      <ConnectivityIndicator compact placement="up" />
    </div>
  )
}
