import { useCallback, useState } from 'react'
import { PARENT_CHILD_IDS, getStudent } from '../../../data/students'
import { readStorage, writeStorage } from '../../../lib/storage'
import type { Student } from '../../../types'

const STORAGE_KEY = 'sangyin.parent.selectedChild'

/** Shown until the school links a child to this parent account. */
const NO_CHILD: Student = {
  id: '',
  name: 'No linked child yet',
  initials: '–',
  classId: '',
  framework: 'uganda',
  subjects: [],
  average: 0,
  trend: 0,
  needsSupport: false,
  currentFocus: '',
  competencies: [],
  guardianName: '',
}

/** Remember which of the parent's children is being viewed. Per-device convenience only. */
export function useSelectedChild() {
  // Read on each render: the list is filled after sign-in, once the data has loaded.
  const children = PARENT_CHILD_IDS.map((id) => getStudent(id)).filter((s): s is Student => s !== undefined)
  const [childId, setChildIdState] = useState<string>(() => readStorage(STORAGE_KEY) ?? '')

  const setChildId = useCallback((id: string) => {
    setChildIdState(id)
    writeStorage(STORAGE_KEY, id)
  }, [])

  const child = children.find((c) => c.id === childId) ?? children[0] ?? NO_CHILD
  return { children, child, setChildId }
}
