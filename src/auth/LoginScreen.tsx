import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

const REMEMBERED_EMAIL_KEY = 'cat4log_remembered_email'

export function LoginScreen() {
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-3xl">Studio</h1>
        <input className="w-full rounded bg-surface-dim border border-surface-bright px-3 py-2 text-on-surface"
          type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded bg-surface-dim border border-surface-bright px-3 py-2 text-on-surface"
          type="password" placeholder="Senha" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label className="flex items-center gap-2 text-sm text-on-surface/60 cursor-pointer select-none">
          <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)}
            className="accent-on-surface" />
          Lembrar email
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-on-surface text-surface py-2 font-medium disabled:opacity-50">
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
