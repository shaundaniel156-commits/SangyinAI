import { useLocation } from 'react-router-dom'
import { useSession } from '../../context/SessionContext'
import { NAVIGATION } from '../../routes/navigation'

/**
 * The `to` of the one navigation item for the current page. Items with a query (e.g. /data?tab=people) only match
 * when it matches, and win over the plain path, so "Add students & parents" lights Learners rather than Planning.
 */
export function useActiveNav(): string | null {
  const { role } = useSession()
  const { pathname, search } = useLocation()
  const params = new URLSearchParams(search)
  let best: { to: string; score: number } | null = null
  for (const item of NAVIGATION[role].flatMap((g) => g.items)) {
    const [path, query] = item.to.split('?')
    if (pathname !== path && !pathname.startsWith(path + '/')) continue
    const wanted = [...new URLSearchParams(query ?? '')]
    if (!wanted.every(([k, v]) => params.get(k) === v)) continue
    const score = path.length + wanted.length * 1000
    if (!best || score > best.score) best = { to: item.to, score }
  }
  return best?.to ?? null
}
