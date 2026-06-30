import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const REMEMBERED_EMAIL_KEY = 'cat4log_remembered_email'

export function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const reduce = useReducedMotion()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setBusy(false) }
    // sucesso: AuthProvider detecta sessão via onAuthStateChange, fecha o modal
    else onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-6"
      style={{ background: 'var(--backdrop)' }}
      onClick={onClose}
    >
      <motion.form
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm space-y-5 rounded-2xl bg-surface-dim p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-on-variant transition hover:bg-surface-2 hover:text-on-surface"
        >
          <X size={16} />
        </button>
        <div className="space-y-1 text-center">
          <h1 className="font-display text-3xl tracking-tight">cat4log</h1>
          <p className="text-sm text-on-faint">Entre para gerenciar suas coleções</p>
        </div>
        <input className="field" type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="field" type="password" placeholder="Senha" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-on-variant">
          <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)}
            className="accent-accent" />
          Lembrar email
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </motion.form>
    </div>
  )
}
