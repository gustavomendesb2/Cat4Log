import { useState } from 'react'
import { X } from 'lucide-react'
import type { AspectRatio, Collection, NewCard } from '../lib/catalog/types'
import { parseCardsCsv } from '../lib/catalog/csv'
import { createCards } from '../lib/catalog/repository'

const RATIOS: AspectRatio[] = ['1:1', '9:16', '3:4']

export function AddFlow({ collection, onClose, onAdded }: {
  collection: Collection; onClose: () => void; onAdded: () => void
}) {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual')
  const [busy, setBusy] = useState(false)
  // manual
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [ratio, setRatio] = useState<AspectRatio>('3:4')
  const [tags, setTags] = useState('')
  // csv
  const [preview, setPreview] = useState<NewCard[]>([])
  const [errors, setErrors] = useState<string[]>([])

  async function onCsv(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    const res = parseCardsCsv(text)
    setPreview(res.rows); setErrors(res.errors)
  }

  async function submit() {
    setBusy(true)
    const rows: NewCard[] = mode === 'manual'
      ? [{ number, name, aspectRatio: ratio, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }]
      : preview
    await createCards(collection.id, rows)
    setBusy(false); onAdded()
  }

  const canSubmit = mode === 'manual' ? number.trim() && name.trim() : preview.length > 0

  return (
    <div className="fixed inset-0 z-30 grid place-items-center p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded bg-surface-dim border border-surface-bright p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Adicionar a {collection.name}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-on-variant hover:text-on-surface"><X /></button>
        </div>

        <div className="flex gap-2 text-sm">
          {(['manual', 'csv'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded px-3 py-1 ${mode === m ? 'bg-on-surface text-surface' : 'text-on-variant'}`}>
              {m === 'manual' ? 'Manual' : 'Importar CSV'}
            </button>
          ))}
        </div>

        {mode === 'manual' ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número (ex: 152)"
                className="w-32 rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome"
                className="flex-1 rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)}
                className="rounded bg-surface border border-surface-bright px-2 py-2 text-sm">
                {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, por vírgula"
                className="flex-1 rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
            </div>
            <p className="text-xs text-on-variant">O card entra vazio; envie a imagem depois pelo próprio card.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input type="file" accept=".csv,text/csv" onChange={(e) => onCsv(e.target.files?.[0])}
              className="block w-full text-sm text-on-variant" />
            <p className="text-xs text-on-variant">Formato: <code>number,name,tags</code> (tags separadas por <code>;</code>).</p>
            {errors.length > 0 && <p className="text-xs text-red-400">{errors.length} linha(s) com problema, ignoradas.</p>}
            {preview.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border border-surface-bright text-sm">
                {preview.map((r, i) => (
                  <div key={i} className="flex justify-between px-3 py-1 border-b border-surface-bright/40">
                    <span>{r.number} {r.name}</span>
                    <span className="text-on-variant">{r.tags.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button disabled={busy || !canSubmit} onClick={submit}
          className="w-full rounded bg-on-surface text-surface py-2 text-sm font-medium disabled:opacity-40">
          {busy ? 'Adicionando…' : mode === 'csv' ? `Adicionar ${preview.length} card(s)` : 'Adicionar card'}
        </button>
      </div>
    </div>
  )
}
