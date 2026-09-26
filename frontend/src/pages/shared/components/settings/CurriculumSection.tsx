import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { useSession } from '../../../../context/SessionContext'
import { CURRICULUM_FRAMEWORKS, FRAMEWORK_LABEL } from '../../../../data/curriculum'
import { DEMO_SCHOOL } from '../../../../data/school'
import { classesInScope } from '../../../../data/selectors'
import { cn } from '../../../../lib/cn'
import type { CurriculumFramework } from '../../../../types'
import { SettingsSection } from './SettingsSection'

export function CurriculumSection() {
  const { role } = useSession()
  const admin = role === 'admin'
  const classes = classesInScope(role)
  const [framework, setFramework] = useState<CurriculumFramework>(DEMO_SCHOOL.primaryFramework)

  return (
    <SettingsSection
      title="Curriculum framework"
      description={
        admin
          ? 'The school’s primary framework. Per-class frameworks are set in Academic Structure.'
          : 'Default framework for new assessments and curriculum views in your classes.'
      }
    >
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink">{admin ? 'School primary framework' : 'Default framework'}</legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {CURRICULUM_FRAMEWORKS.map((f) => (
            <label
              key={f.id}
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors',
                framework === f.id ? 'border-brand-500 bg-brand-soft' : 'border-line hover:bg-surface-2',
              )}
            >
              <input
                type="radio"
                name="framework"
                value={f.id}
                checked={framework === f.id}
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
              Change a class’s framework in{' '}
              <Link to="/admin/structure" className="font-medium text-brand-ink hover:underline">
                Academic Structure
              </Link>
              .
            </>
          ) : (
            'Class frameworks are configured by your school administrator.'
          )}
        </p>
      </div>
    </SettingsSection>
  )
}
