import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AiAssessmentsProvider } from './context/AiAssessmentsContext'
import { ConnectivityProvider } from './context/ConnectivityContext'
import { GuidanceReviewProvider } from './context/GuidanceReviewContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { SessionProvider } from './context/SessionContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SessionProvider>
          <ConnectivityProvider>
            <NotificationsProvider>
              <GuidanceReviewProvider>
                <AiAssessmentsProvider>
                  <ToastProvider>
                    <App />
                  </ToastProvider>
                </AiAssessmentsProvider>
              </GuidanceReviewProvider>
            </NotificationsProvider>
          </ConnectivityProvider>
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
