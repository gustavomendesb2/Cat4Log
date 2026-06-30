import { useCallback, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/authContext'
import { LoginModal } from './auth/LoginModal'
import { CollectionPage } from './pages/CollectionPage'

export function Gate() {
  const { loading, session } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const openLogin = useCallback(() => setLoginOpen(true), [])
  const closeLogin = useCallback(() => setLoginOpen(false), [])

  if (loading) return <div className="min-h-screen grid place-items-center text-on-variant">Carregando…</div>

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/pokemon" replace />} />
        <Route path="/:slug" element={<CollectionPage onLoginOpen={openLogin} />} />
        <Route path="/:slug/:style" element={<CollectionPage onLoginOpen={openLogin} />} />
        <Route path="*" element={<Navigate to="/pokemon" replace />} />
      </Routes>
      {loginOpen && !session && <LoginModal onClose={closeLogin} />}
    </>
  )
}
