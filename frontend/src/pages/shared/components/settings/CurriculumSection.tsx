import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { useLiveData } from '../../../../context/LiveDataContext'
import { useSession } from '../../../../context/SessionContext'
import { useToast } from '../../../../context/ToastContext'
import { CURRICULUM_FRAMEWORKS, FRAMEWORK_LABEL } from '../../../../data/curriculum'
import { SCHOOL } from '../../../../data/school'
import { classesInScope } from '../../../../data/selectors'
import { api } from '../../../../lib/api'
import { cn } from '../../../../lib/cn'
import type { CurriculumFramework } from '../../../../types'
import { SettingsSection } from './SettingsSection'

/** The school's curriculum: administrators change it (saved with the school's details); teachers see it. */
export function CurriculumSection() {
  const { role } = useSession()
  const { live, refresh } = useLiveData()
  const { notify } = useToast()
  const admin = role === 'admin'
  const classes = classesInScope(role)
  const [framework, setFramework] = useState<CurriculumFramework>(SCHOOL.primaryFramework)
  // National or Cambridge for the school; a school's own curriculum is given to classes in the Manual feed.
  const options = CURRICULUM_FRAMEWORKS.filter((f) => f.id === 'uganda' || f.id === 'cambridge')

  const save = async () => {
    if (!live) return notify('Offline', { tone: 'info', description: 'Sign in while connected to change the curriculum.' })
    try {
      await api('/feed/institution', { method: 'PATCH', body: { framework } })
      await refresh()
      notify('Curriculum saved', { description: 'The class names offered now follow it.' })
    } catch (error) {
      notify('Not saved', { tone: 'info', description: (error as Error).message })
    }
  }

  return (
    <SettingsSection
      title="Curriculum framework"
      description={
        admin
          ? 'The school’s curriculum. With the type of school, it decides the class names offered. Each class can follow its own.'
          : 'The curriculum your school follows, set by your school administrator.'
      }
      saveLabel={admin ? 'Save curriculum' : false}
      onSave={save}
    >
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink">School curriculum</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {options.map((f) => (
            <label
              key={f.id}
              className={cn(
                'flex gap-3 rounded-lg border p-4 transition-colors',
                framework === f.id ? 'border-brand-500 bg-brand-soft' : 'border-line',
                admin ? 'cursor-pointer hover:bg-surface-2' : 'cursor-default',
              )}
            >
              <input
                type="radio"
                name="framework"
                value={f.id}
                checked={framework === f.id}
                disabled={!admin}
                onChange={() => setFramework(f.id)}
                className="mt-0.5 size-4 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{f.name}</span>
                <span className="mt-0.5 block text-sm text-ink-3">{f.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-ink">{admin ? 'Classes' : 'Your classes'}</h3>
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
          {classes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="text-ink">{c.name}</span>
              <StatusBadge tone={c.framework === 'cambridge' ? 'accent' : 'neutral'}>{FRAMEWORK_LABEL[c.framework]}</StatusBadge>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-3">
          {admin ? (
            <>
              A class’s curriculum is set when the class is added or updated in{' '}
              <Link to="/data?tab=people" className="font-medium text-brand-ink hover:underline">
                Manual feed
              </Link>{' '}
              (Staff and classes, the Curriculum column).
            </>
          ) : (
            'Class curricula are set by your school administrator.'
          )}
        </p>
      </div>
    </SettingsSection>
  )
}
