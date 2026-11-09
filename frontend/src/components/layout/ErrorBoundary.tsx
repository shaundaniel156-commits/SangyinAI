import { Component, type ErrorInfo, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ErrorBoundaryProps {
  children: ReactNode
  /** The page address: when it changes (the user opens another page), the pages are shown again. */
  resetKey?: string
  /** Fills the screen, for an error outside the pages (the app shell has its own, around each page). */
  fullScreen?: boolean
}

/**
 * Catches an unexpected error in whatever it wraps and shows a plain message with a way out, instead of a
 * blank screen. Around each page (AppShell) the menus stay usable; around the whole app (main.tsx) it is the last resort.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean; resetKey?: string }> {
  state = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: { resetKey?: string }) {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A page could not be shown.', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const { fullScreen } = this.props
    return (
      <div role="alert" className={cn('grid place-items-center px-4 text-center', fullScreen ? 'min-h-screen bg-canvas' : 'py-16')}>
        <div className="max-w-sm">
          <p className="text-base font-semibold text-ink">Something went wrong</p>
          <p className="mt-1 text-sm text-ink-3">This page could not be shown. Your saved work is safe. Reload the page, or go back and try again.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Reload
            </button>
            <button
              type="button"
              onClick={() => (fullScreen ? window.location.assign('/') : window.history.back())}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2"
            >
              {fullScreen ? 'Go to the start page' : 'Go back'}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
