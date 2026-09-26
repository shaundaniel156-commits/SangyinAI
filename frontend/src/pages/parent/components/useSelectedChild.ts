import { useCallback, useState } from 'react'
import { DEMO_PARENT_CHILD_IDS, getStudent } from '../../../data/students'
import { readStorage, writeStorage } from '../../../lib/storage'
import type { Student } from '../../../types'

const STORAGE_KEY = 'sangyin.parent.selectedChild'

const CHILDREN: Student[] = DEMO_PARENT_CHILD_IDS.map((id) => getStudent(id)).filter((s): s is Student => s !== undefined)

/** Remember which of the parent's (demo) children is being viewed. Per-device convenience only. */
export function useSelectedChild() {
  const [childId, setChildIdState] = useState<string>(() => {
    const saved = readStorage(STORAGE_KEY)
    return saved && CHILDREN.some((c) => c.id === saved) ? saved : CHILDREN[0]!.id
  })

  const setChildId = useCallback((id: string) => {
    setChildIdState(id)
    writeStorage(STORAGE_KEY, id)
  }, [])

  const child = CHILDREN.find((c) => c.id === childId) ?? CHILDREN[0]!
  return { children: CHILDREN, child, setChildId }
}
