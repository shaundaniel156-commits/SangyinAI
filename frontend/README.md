# Sangyin AI — Frontend (UI Prototype)

**AI-Guided Adaptive Education System** — Performance-Driven Curriculum & Teaching Guidance Platform.

This folder contains the **frontend UI prototype only**. There is no backend, database, API,
authentication, AI integration, SMS/USSD or real offline synchronisation yet. All data shown
is clearly labelled demo data.

## Stack

- React + TypeScript (Vite)
- Tailwind CSS v4
- `react-router-dom` for routing, `lucide-react` for icons
- Charts are lightweight SVG components (no chart library)

## Run

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Sign in from `/login` by choosing a role (Teacher, Administrator, Parent, Student). No
credentials are checked. The role can also be switched from the user menu ("View as").

## Structure

```
src/
  components/
    layout/     App shell: Sidebar, Topbar, MobileNav, ConnectivityIndicator, menus
    ui/         Reusable primitives: Button, Card, StatCard, DataTable, Modal/Drawer, fields…
    charts/     ChartContainer, LineChart, BarList, ColumnChart
    domain/     Education-specific pieces: StudentCard, GuidanceCard, NotificationItem…
  context/      Frontend-only state: demo session/role, theme, connectivity UI state, toasts
  data/         MOCK DATA ONLY — replace with API calls later
  lib/          Small helpers (formatting, class names, demo thresholds)
  pages/        Screens grouped by role (teacher, admin, parent, student, shared, auth)
  routes/       Role-aware navigation configuration
  types/        Shared TypeScript types
```

### Replacing mock data

Every screen reads data through the getter/selectors in `src/data/*`
(e.g. `getStudent`, `studentsInScope`). These are the seams where API calls will be
introduced later; components should not need to change shape.

### Curriculum content

The curriculum hierarchy in `src/data/curriculum.ts` is an **illustrative demo structure
only** and is not official NCDC or Cambridge International content.

## Screens (routes)

| Area | Routes |
|---|---|
| Auth | `/login` |
| Teacher / Admin | `/dashboard`, `/students`, `/students/:id`, `/classes`, `/classes/:id`, `/assessments`, `/assessments/new`, `/assessments/import`, `/assessments/:id`, `/performance`, `/diagnostics`, `/diagnostics/:id`, `/guidance`, `/guidance/:id`, `/curriculum`, `/reports` |
| Admin only | `/admin/structure`, `/admin/users`, `/admin/teachers` |
| Parent | `/parent/dashboard`, `/parent/children`, `/parent/progress`, `/parent/focus`, `/parent/home-support` |
| Student | `/student/dashboard`, `/student/learning`, `/student/practice`, `/student/progress`, `/student/feedback` |
| All roles | `/notifications`, `/settings` |

## What is UI-only (by design, for this phase)

- Sign-in, password reset, invites, saving settings/scores/assessments — show feedback, persist nothing.
- Guidance decisions (approve / edit / request revision / override) are held in memory until reload.
- Excel/CSV import, PDF/CSV export — visual only. Print uses the browser's print dialog.
- Online / Offline / Syncing indicator — previewable states; no network detection or sync.
- Theme (light / dark / system) is the only preference that takes effect.
