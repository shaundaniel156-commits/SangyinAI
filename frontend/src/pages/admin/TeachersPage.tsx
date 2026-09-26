import { Mail, UserPlus, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button, buttonClasses } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { FilterBar } from '../../components/ui/FilterBar'
import { Drawer } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchBar } from '../../components/ui/SearchBar'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getClass } from '../../data/classes'
import { TEACHERS } from '../../data/teachers'
import type { Subject, Teacher } from '../../types'
import { ACCOUNT_STATUS_LABEL, AccountStatusBadge } from './components/AccountStatusBadge'
import { InviteModal } from './components/InviteModal'
import { TeacherDetails } from './components/TeacherDetails'

const SUBJECTS: Subject[] = ['Mathematics', 'English', 'Science', 'Social Studies']

export function TeachersPage() {
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<Teacher | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TEACHERS.filter(
      (t) =>
        (subject === 'all' || t.subjects.includes(subject as Subject)) &&
        (status === 'all' || t.status === status) &&
        (!q || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)),
    )
  }, [query, subject, status])

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Teaching staff, their subjects and class assignments."
        actions={
          <Button onClick={() => setInviteOpen(true)} icon={<UserPlus className="size-4" aria-hidden />}>
            Invite teacher
          </Button>
        }
      />

      <Card>
        <div className="border-b border-line p-4">
          <FilterBar
            search={<SearchBar value={query} onChange={setQuery} placeholder="Search teachers" label="Search teachers" />}
            filters={[
              {
                id: 'subject',
                label: 'Filter by subject',
                value: subject,
                onChange: setSubject,
                options: [{ value: 'all', label: 'All subjects' }, ...SUBJECTS.map((s) => ({ value: s, label: s }))],
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
        <DataTable<Teacher>
          caption="Teachers — select a row to view details"
          rows={rows}
          rowKey={(t) => t.id}
          onRowClick={setSelected}
          empty={<EmptyState icon={UserX} title="No teachers match" description="Try a different search or clear the filters." />}
          columns={[
            {
              id: 'name',
              header: 'Teacher',
              cell: (t) => (
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(t) }} className="flex min-w-0 items-center gap-3 text-left">
                  <Avatar initials={t.initials} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink hover:underline">{t.name}</span>
                    <span className="block truncate text-xs text-ink-3">{t.email}</span>
                  </span>
                </button>
              ),
            },
            {
              id: 'subjects',
              header: 'Subjects',
              hideBelow: 'md',
              cell: (t) => (
                <div className="flex flex-wrap gap-1">
                  {t.subjects.map((s) => (
                    <StatusBadge key={s} tone="neutral">{s}</StatusBadge>
                  ))}
                </div>
              ),
            },
            {
              id: 'classes',
              header: 'Classes',
              hideBelow: 'lg',
              cell: (t) => <span className="text-ink-2">{t.classIds.map((id) => getClass(id)?.name.replace(' (Sample Class)', '')).join(', ')}</span>,
            },
            { id: 'status', header: 'Status', cell: (t) => <AccountStatusBadge status={t.status} /> },
            { id: 'last', header: 'Last active', hideBelow: 'sm', className: 'whitespace-nowrap text-ink-2', cell: (t) => t.lastActive },
          ]}
        />
      </Card>
      <p className="mt-3 text-xs text-ink-3">Demo accounts for UI preview only.</p>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? 'Teacher'}
        description={selected?.email}
        footer={
          selected && (
            <a href={`mailto:${selected.email}`} className={buttonClasses('secondary')}>
              <Mail className="size-4" aria-hidden />
              Email teacher
            </a>
          )
        }
      >
        {selected && <TeacherDetails teacher={selected} />}
      </Drawer>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} fixedRole="teacher" />
    </>
  )
}
