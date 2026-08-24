import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/contexts/AuthContext'
import { TaxFilterProvider } from '@/contexts/TaxFilterContext'
import { ToastProvider } from '@/lib/toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TaxFilterProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </TaxFilterProvider>
    </AuthProvider>
  </StrictMode>,
)
