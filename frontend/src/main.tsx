import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { AiAssessmentsProvider } from './context/AiAssessmentsContext'
import { ConnectivityProvider } from './context/ConnectivityContext'
import { GuidanceReviewProvider } from './context/GuidanceReviewContext'
import { LiveDataProvider } from './context/LiveDataContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { SessionProvider } from './context/SessionContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ErrorBoundary fullScreen>
        <SessionProvider>
          <ConnectivityProvider>
            <ToastProvider>
              <LiveDataProvider>
                <NotificationsProvider>
                  <GuidanceReviewProvider>
                    <AiAssessmentsProvider>
                      <App />
                    </AiAssessmentsProvider>
                  </GuidanceReviewProvider>
                </NotificationsProvider>
              </LiveDataProvider>
            </ToastProvider>
          </ConnectivityProvider>
        </SessionProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
