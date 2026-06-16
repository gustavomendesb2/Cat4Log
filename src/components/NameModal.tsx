import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

export function NameModal({
  title, label, initial = '', submitLabel = 'Salvar', onSubmit, onClose,
  descriptionLabel, initialDescription = '',
}: {
  title: string; label: string; initial?: string; submitLabel?: string
  onSubmit: (name: string, description: string) => Promise<void> | void; onClose: () => void
  descriptionLabel?: string; initialDescription?: string
}) {
  const [name, setName] = useState(initial)
  const [description, setDescription] = useState(initialDescription)
  const [busy, setBusy] = useState(false)
  const reduce = useReducedMotion()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await onSubmit(name.trim(), description.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4 sm:p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <motion.form
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onSubmit={submit} className="modal-card max-w-sm space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-on-variant transition hover:text-on-surface"><X /></button>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm text-on-variant">{label}</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="field" />
        </div>
        {descriptionLabel && (
          <div className="space-y-1.5">
            <label className="block text-sm text-on-variant">{descriptionLabel}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="field resize-none" />
          </div>
        )}
        <button disabled={busy || !name.trim()} className="btn-primary w-full">
          {busy ? 'Salvando…' : submitLabel}
        </button>
      </motion.form>
    </div>
  )
}
