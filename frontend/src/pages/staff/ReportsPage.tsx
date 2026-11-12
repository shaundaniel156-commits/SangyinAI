import { FileSpreadsheet, FileText, Printer, SlidersHorizontal, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSession } from '../../context/SessionContext'
import { useToast } from '../../context/ToastContext'
import { assessmentsInScope, classesInScope } from '../../data/selectors'
import { getStudentsByClass } from '../../data/students'
import { downloadCsv } from '../../lib/csv'
import { formatDate } from '../../lib/format'
import { ClassReport } from './reports/ClassReport'
import { CompetencyReport } from './reports/CompetencyReport'
import { ReportDocument } from './reports/ReportDocument'
import { ReportFilterPanel } from './reports/ReportFilterPanel'
import { ReportTypePicker } from './reports/ReportTypePicker'
import { StudentReport } from './reports/StudentReport'
import { SubjectPerformanceReport } from './reports/SubjectReport'
import { REPORT_TITLES, type ReportFilters, type ReportType } from './reports/types'

export function ReportsPage() {
  const { role } = useSession()
  const { notify } = useToast()
  const classes = classesInScope(role)
  // The report preview on screen, read for the CSV export.
  const preview = useRef<HTMLDivElement>(null)

  const [type, setType] = useState<ReportType>('student')
  const [filters, setFilters] = useState<ReportFilters>({
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

  // PDF: the browser's print window makes the file when "Save as PDF" is chosen as the printer.
  const exportPdf = () => {
    notify('Choose “Save as PDF” as the printer', { tone: 'info', description: 'The print window is opening. Pick “Save as PDF” (or “Microsoft Print to PDF”) to make a PDF file.' })
    window.setTimeout(() => window.print(), 300)
  }
  // CSV: the headings, figures and tables of the report on screen, as a file Excel or Google Sheets opens.
  const exportCsv = () => {
    const rows = reportRows(preview.current?.querySelector('article') ?? null)
    if (!rows.length) return notify('Nothing to export yet', { tone: 'info' })
    const filename = `sangyin-${type}-report-${new Date().toISOString().slice(0, 10)}.csv`
    downloadCsv(filename, rows)
    notify('CSV downloaded', { description: `${filename} — open it in Excel or Google Sheets. Charts are not included.` })
  }

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
              <Button variant="secondary" icon={<FileText className="size-4" aria-hidden />} onClick={exportPdf}>
                Export PDF
              </Button>
              <Button variant="secondary" icon={<FileSpreadsheet className="size-4" aria-hidden />} onClick={exportCsv}>
                Export CSV/Excel
              </Button>
              <Button icon={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>
                Print
              </Button>
            </>
          }
        />
        <DemoNotice className="mb-6">
          Reports are made in the browser from your school’s recorded results. Export PDF and Print open your browser’s print window
          (choose “Save as PDF” for a file); Export CSV/Excel downloads the report’s figures and tables. Use the date range to limit a
          report to one term’s assessments.
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

        <div className="min-w-0" ref={preview}>
          <p className="no-print mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Preview</p>
          <ReportDocument title={REPORT_TITLES[type]} subtitle={subtitle} period={period}>
            {renderBody()}
          </ReportDocument>
        </div>
      </div>
    </>
  )
}

/**
 * The report on screen as rows of text for a CSV file: its heading and details, then each part in order — a line of
 * text, a block of figures (label, value) or a section with its table or bar list. Charts have no rows.
 */
function reportRows(doc: Element | null): string[][] {
  if (!doc) return []
  // Text as it reads on screen; a line break inside a cell (a sub-label) becomes " · ".
  const text = (el: Element | Node | null | undefined) => ((el as HTMLElement | null)?.innerText ?? el?.textContent ?? '').replace(/\s*\n+\s*/g, ' · ').replace(/\s+/g, ' ').trim()
  const pairs = (dl: Element) => [...dl.querySelectorAll('dt')].map((dt) => [text(dt), text(dt.nextElementSibling)])
  const rows: string[][] = [[text(doc.querySelector('h2'))]]
  const header = doc.querySelector('header')
  const subtitle = header?.querySelector('h2 + p')
  if (subtitle) rows.push([text(subtitle)])
  const details = header?.querySelector('dl')
  if (details) rows.push(...pairs(details))
  for (const part of doc.querySelectorAll(':scope > div > p, :scope > div > dl, :scope > div > section')) {
    if (part.tagName === 'P') rows.push([], [text(part)])
    else if (part.tagName === 'DL') rows.push([], ...pairs(part))
    else {
      const body: string[][] = []
      const table = part.querySelector('table')
      if (table) for (const tr of table.querySelectorAll('tr')) body.push([...tr.querySelectorAll('th, td')].map(text))
      else for (const li of part.querySelectorAll('li')) {
        const [label, value] = li.querySelectorAll(':scope > div:first-child > span')
        if (label && value) body.push([text(label.firstChild), text(label.querySelector('span')), text(value)])
      }
      const note = body.length ? null : part.querySelector(':scope > div > p')
      if (note) body.push([text(note)])
      rows.push([], [text(part.querySelector('h3'))], ...(body.length ? body : [['(chart — not included)']]))
    }
  }
  return rows
}
