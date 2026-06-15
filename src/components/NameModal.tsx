import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

export function NameModal({ title, label, initial = '', submitLabel = 'Salvar', onSubmit, onClose }: {
  title: string; label: string; initial?: string; submitLabel?: string
  onSubmit: (name: string) => Promise<void> | void; onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await onSubmit(name.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-sm rounded bg-surface-dim border border-surface-bright p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-on-variant hover:text-on-surface"><X /></button>
        </div>
        <label className="block text-sm text-on-variant">{label}</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded bg-surface border border-surface-bright px-3 py-2 text-sm text-on-surface" />
        <button disabled={busy || !name.trim()} className="w-full rounded bg-on-surface text-surface py-2 text-sm font-medium disabled:opacity-40">
          {busy ? 'Salvando…' : submitLabel}
        </button>
      </form>
    </div>
  )
}
