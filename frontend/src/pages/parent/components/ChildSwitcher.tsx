import { SegmentedControl } from '../../../components/ui/Tabs'
import type { Student } from '../../../types'

interface ChildSwitcherProps {
  childList: Student[]
  value: string
  onChange: (id: string) => void
}

/** Simple switch between the parent's linked children. Hidden when printing. */
export function ChildSwitcher({ childList, value, onChange }: ChildSwitcherProps) {
  if (childList.length < 2) return null
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-3">Viewing</span>
      <SegmentedControl label="Choose a child" options={childList.map((c) => ({ id: c.id, label: c.name }))} value={value} onChange={onChange} />
    </div>
  )
}
