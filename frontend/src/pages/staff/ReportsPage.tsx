import { FileSpreadsheet, FileText, Printer, SlidersHorizontal, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { DEMO_SCHOOL } from '../../data/school'
import { assessmentsInScope, classesInScope } from '../../data/selectors'
import { getStudentsByClass } from '../../data/students'
import { formatDate } from '../../lib/format'
import { ClassReport } from './reports/ClassReport'
import { CompetencyReport } from './reports/CompetencyReport'
import { ReportDocument } from './reports/ReportDocument'
import { ReportFilterPanel } from './reports/ReportFilterPanel'
import { ReportTypePicker } from './reports/ReportTypePicker'
import { StudentReport } from './reports/StudentReport'
import { SubjectPerformanceReport } from './reports/SubjectReport'
import { REPORT_TITLES, type ReportFilters, type ReportType } from './reports/types'

const CURRENT_TERM = DEMO_SCHOOL.termOptions.find((t) => t.startsWith(DEMO_SCHOOL.currentTerm)) ?? DEMO_SCHOOL.termOptions[0]!

export function ReportsPage() {
  const { role } = useSession()
  const { notify } = useToast()
  const classes = classesInScope(role)

  const [type, setType] = useState<ReportType>('student')
  const [filters, setFilters] = useState<ReportFilters>({
    term: CURRENT_TERM,
    from: '',
    to: '',
    classId: classes[0]?.id ?? 'all',
    studentId: '',
    subject: 'all',
  })
  const update = (patch: Partial<ReportFilters>) => setFilters((f) => ({ ...f, ...patch }))

  // Student and class reports need one specific class; the others allow "all".
  const needsClass = type === 'student' || type === 'class'
  const selectedClass = classes.find((c) => c.id === filters.classId) ?? (needsClass ? classes[0] : undefined)
  const classStudents = selectedClass ? getStudentsByClass(selectedClass.id) : []
  const selectedStudent = classStudents.find((s) => s.id === filters.studentId) ?? classStudents[0]
  const reportClasses = selectedClass && type === 'competency' ? [selectedClass] : classes
  const effective: ReportFilters = { ...filters, classId: selectedClass?.id ?? 'all', studentId: selectedStudent?.id ?? '' }

  const period =
    filters.from || filters.to
      ? `${filters.from ? formatDate(filters.from) : 'Start'} – ${filters.to ? formatDate(filters.to) : 'Latest'}`
      : undefined

  const exportLater = (format: string) =>
    notify(`${format} export is not available yet`, {
      description: 'Export will be available when the backend is connected.',
      tone: 'info',
    })

  const subtitle =
    type === 'student'
      ? selectedStudent?.name
      : type === 'class'
        ? selectedClass?.name
        : type === 'competency'
          ? selectedClass?.name ?? (role === 'admin' ? 'All classes' : 'Your classes')
          : role === 'admin'
            ? 'All classes'
            : 'Your classes'

  const renderBody = () => {
    if (!classes.length) return <EmptyState icon={Users} title="No classes in your scope" />
    switch (type) {
      case 'student':
        return selectedStudent && selectedClass ? (
          <StudentReport student={selectedStudent} cls={selectedClass} filters={effective} />
        ) : (
          <EmptyState icon={Users} title="No students in this class" />
        )
      case 'class':
        return selectedClass ? <ClassReport cls={selectedClass} filters={effective} /> : null
      case 'subject':
        return <SubjectPerformanceReport classes={classes} assessments={assessmentsInScope(role)} filters={effective} />
      case 'competency':
        return <CompetencyReport classes={reportClasses} filters={effective} />
    }
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Reports"
          description="Build a student, class, subject or competency report and preview it before printing or exporting."
          actions={
            <>
              <Button variant="secondary" icon={<FileText className="size-4" aria-hidden />} onClick={() => exportLater('PDF')}>
                Export PDF
              </Button>
              <Button variant="secondary" icon={<FileSpreadsheet className="size-4" aria-hidden />} onClick={() => exportLater('CSV / Excel')}>
                Export CSV/Excel
              </Button>
              <Button icon={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>
                Print
              </Button>
            </>
          }
        />
        <DemoNotice className="mb-6">
          Reports are generated in the browser from demo data. Printing uses your browser’s print dialog; PDF and spreadsheet export
          will be available when the backend is connected. Demo data is not split by term — the term sets the report label.
        </DemoNotice>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] print:block">
        <Card className="no-print h-fit">
          <CardHeader icon={<SlidersHorizontal className="size-5" aria-hidden />} title="Report settings" />
          <CardBody className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink">Report type</h3>
              <ReportTypePicker value={type} onChange={setType} />
            </div>
            <ReportFilterPanel
              type={type}
              filters={effective}
              onChange={update}
              classes={classes}
              students={classStudents}
            />
          </CardBody>
        </Card>

        <div className="min-w-0">
          <p className="no-print mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Preview</p>
          <ReportDocument title={REPORT_TITLES[type]} subtitle={subtitle} term={filters.term} period={period}>
            {renderBody()}
          </ReportDocument>
        </div>
      </div>
    </>
  )
}
