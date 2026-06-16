import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/authContext'
import { LoginScreen } from './auth/LoginScreen'
import { CollectionPage } from './pages/CollectionPage'

export function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-on-variant">Carregando…</div>
  if (!session) return <LoginScreen />
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pokemon" replace />} />
      <Route path="/:slug" element={<CollectionPage />} />
      <Route path="/:slug/:style" element={<CollectionPage />} />
      <Route path="*" element={<Navigate to="/pokemon" replace />} />
    </Routes>
  )
}
