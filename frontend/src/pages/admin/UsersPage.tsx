import { UserPlus, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar } from '../../components/ui/FilterBar'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { USER_ACCOUNTS, type UserAccount } from '../../data/adminUsers'
import { ROLE_LABEL } from '../../data/users'
import type { Role } from '../../types'
import { ACCOUNT_STATUS_LABEL, AccountStatusBadge } from './components/AccountStatusBadge'
import { InviteModal } from './components/InviteModal'

const ROLES: Role[] = ['teacher', 'admin', 'parent', 'student']

export function UsersPage() {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [inviteOpen, setInviteOpen] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return USER_ACCOUNTS.filter(
      (u) =>
        (role === 'all' || u.role === role) &&
        (status === 'all' || u.status === status) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    )
  }, [query, role, status])

  const counts = ROLES.map((r) => ({ role: r, count: USER_ACCOUNTS.filter((u) => u.role === r).length }))

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts for teachers, administrators, parents and students at the demo school."
        actions={
          <Button onClick={() => setInviteOpen(true)} icon={<UserPlus className="size-4" aria-hidden />}>
            Invite user
          </Button>
        }
        meta={counts.map((c) => (
          <StatusBadge key={c.role} tone="neutral">
            {ROLE_LABEL[c.role]}: <span className="tabular">{c.count}</span>
          </StatusBadge>
        ))}
      />

      <Card>
        <div className="border-b border-line p-4">
          <FilterBar
            search={<SearchBar value={query} onChange={setQuery} placeholder="Search by name or email" label="Search users" />}
            filters={[
              {
                id: 'role',
                label: 'Filter by role',
                value: role,
                onChange: setRole,
                options: [{ value: 'all', label: 'All roles' }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))],
              },
              {
                id: 'status',
                label: 'Filter by status',
                value: status,
                onChange: setStatus,
                options: [
                  { value: 'all', label: 'All statuses' },
                  ...Object.entries(ACCOUNT_STATUS_LABEL).map(([value, label]) => ({ value, label })),
                ],
              },
            ]}
          />
        </div>
        <DataTable<UserAccount>
          caption="User accounts"
          rows={rows}
          rowKey={(u) => `${u.role}-${u.id}`}
          empty={<EmptyState icon={UserX} title="No users match" description="Try a different search or clear the filters." />}
          columns={[
            {
              id: 'name',
              header: 'Name',
              cell: (u) => (
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={u.initials} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{u.name}</p>
                    <p className="truncate text-xs text-ink-3">{u.email}</p>
                  </div>
                </div>
              ),
            },
            { id: 'role', header: 'Role', cell: (u) => <span className="whitespace-nowrap text-ink-2">{ROLE_LABEL[u.role]}</span> },
            { id: 'detail', header: 'Linked to', hideBelow: 'lg', cell: (u) => <span className="text-ink-2">{u.detail}</span> },
            { id: 'status', header: 'Status', hideBelow: 'sm', cell: (u) => <AccountStatusBadge status={u.status} /> },
            { id: 'last', header: 'Last active', hideBelow: 'md', className: 'whitespace-nowrap text-ink-2', cell: (u) => u.lastActive },
          ]}
        />
      </Card>
      <p className="mt-3 text-xs text-ink-3">Demo accounts for UI preview only.</p>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  )
}
