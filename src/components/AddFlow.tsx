import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import type { AspectRatio, NewCard, Subcollection } from '../lib/catalog/types'
import { parseCardsCsv } from '../lib/catalog/csv'
import { createCards } from '../lib/catalog/repository'

const RATIOS: AspectRatio[] = ['1:1', '9:16', '3:4']

export function AddFlow({ collectionName, subcollections, defaultSubId, onClose, onAdded }: {
  collectionName: string
  subcollections: Subcollection[]
  defaultSubId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')
  const [busy, setBusy] = useState(false)
  const [targetSub, setTargetSub] = useState(defaultSubId)
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [ratio, setRatio] = useState<AspectRatio>('9:16')
  const [tags, setTags] = useState('')
  const [csvRatio, setCsvRatio] = useState<AspectRatio>('9:16')
  const [preview, setPreview] = useState<NewCard[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const reduce = useReducedMotion()

  async function onCsv(file: File | undefined) {
    if (!file) return
    const res = parseCardsCsv(await file.text())
    setPreview(res.rows); setErrors(res.errors)
  }

  async function submit() {
    setBusy(true)
    const rows: NewCard[] = mode === 'manual'
      ? [{ number, name, aspectRatio: ratio, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }]
      : preview.map((r) => ({ ...r, aspectRatio: csvRatio }))
    await createCards(targetSub, rows)
    setBusy(false); onAdded()
  }

  const canSubmit = mode === 'manual' ? name.trim() !== '' : preview.length > 0
  const tab = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 transition ${active ? 'bg-accent font-medium text-surface-dim' : 'text-on-variant hover:bg-surface-2 hover:text-on-surface'}`

  return (
    <div className="fixed inset-0 z-30 grid place-items-center p-4 sm:p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="modal-card max-w-lg space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Adicionar a {collectionName}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-on-variant transition hover:text-on-surface"><X /></button>
        </div>

        {subcollections.length > 1 && (
          <label className="block text-sm text-on-variant">
            Estilo de destino
            <select value={targetSub} onChange={(e) => setTargetSub(e.target.value)} className="field mt-1">
              {subcollections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}

        <div className="flex gap-1.5 text-sm">
          {(['manual', 'csv'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={tab(mode === m)}>
              {m === 'manual' ? 'Manual' : 'Importar CSV'}
            </button>
          ))}
        </div>

        {mode === 'manual' ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número (vazio = próximo)"
                className="field !w-44" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="field flex-1" />
            </div>
            <div className="flex gap-3">
              <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="field !w-auto">
                {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, por vírgula" className="field flex-1" />
            </div>
            <p className="text-xs text-on-faint">Número vazio recebe o próximo disponível no estilo. Imagem você envia depois pelo card.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="file" accept=".csv,text/csv" onChange={(e) => onCsv(e.target.files?.[0])}
              className="block w-full text-sm text-on-variant file:mr-3 file:rounded file:border-0 file:bg-surface-3 file:px-3 file:py-1.5 file:text-on-surface" />
            <label className="flex items-center gap-2 text-sm text-on-variant">
              Proporção dos cards
              <select value={csvRatio} onChange={(e) => setCsvRatio(e.target.value as AspectRatio)} className="field !w-auto">
                {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <p className="text-xs text-on-faint">Formato: <code>number,name,tags</code> (tags por <code>;</code>). Número pode ficar vazio.</p>
            {errors.length > 0 && <p className="text-xs text-red-400">{errors.length} linha(s) ignorada(s) (sem nome).</p>}
            {preview.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border border-surface-bright/60 text-sm">
                {preview.map((r, i) => (
                  <div key={i} className="flex justify-between border-b border-surface-bright/30 px-3 py-1">
                    <span>{r.number || '—'} {r.name}</span>
                    <span className="text-on-variant">{r.tags.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button disabled={busy || !canSubmit} onClick={submit} className="btn-primary w-full">
          {busy ? 'Adicionando…' : mode === 'csv' ? `Adicionar ${preview.length} card(s)` : 'Adicionar card'}
        </button>
      </motion.div>
    </div>
  )
}
