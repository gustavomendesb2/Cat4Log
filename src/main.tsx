import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LoginScreen } from './auth/LoginScreen'
import { CollectionPage } from './pages/CollectionPage'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-on-variant">Carregando…</div>
  if (!session) return <LoginScreen />
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pokemon" replace />} />
      <Route path="/:slug" element={<CollectionPage />} />
      <Route path="*" element={<Navigate to="/pokemon" replace />} />
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
