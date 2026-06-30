import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/authContext'
import { LoginModal } from './auth/LoginModal'
import { CollectionPage } from './pages/CollectionPage'

export function Gate() {
  const { loading } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)

  if (loading) return <div className="min-h-screen grid place-items-center text-on-variant">Carregando…</div>

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/pokemon" replace />} />
        <Route path="/:slug" element={<CollectionPage onLoginOpen={() => setLoginOpen(true)} />} />
        <Route path="/:slug/:style" element={<CollectionPage onLoginOpen={() => setLoginOpen(true)} />} />
        <Route path="*" element={<Navigate to="/pokemon" replace />} />
      </Routes>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  )
}
