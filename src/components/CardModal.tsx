import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X, Upload, Trash2 } from 'lucide-react'
import type { AspectRatio, Card } from '../lib/catalog/types'
import { deleteCard, imageUrl, updateCard, uploadCardImage } from '../lib/catalog/repository'

const RATIOS: AspectRatio[] = ['1:1', '9:16', '3:4']

export function CardModal({ card, onClose, onChanged }: {
  card: Card; onClose: () => void; onChanged: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [optimize, setOptimize] = useState(true)
  const [tags, setTags] = useState(card.tags.join(', '))
  const [ratio, setRatio] = useState<AspectRatio>(card.aspectRatio)
  const reduce = useReducedMotion()
  const url = imageUrl(card.imagePath)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    await uploadCardImage(card, file, optimize)
    setBusy(false); onChanged(); onClose()
  }
  async function saveMeta() {
    setBusy(true)
    await updateCard(card.id, { aspectRatio: ratio, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
    setBusy(false); onChanged()
  }
  async function remove() {
    setBusy(true); await deleteCard(card.id); setBusy(false); onChanged(); onClose()
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center p-4 sm:p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="modal-card max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="grid max-h-[55vh] place-items-center bg-surface-dim md:max-h-[80vh]">
            {url ? <img src={url} alt={card.name} className="h-full w-full object-contain" />
                 : <span className="py-24 text-on-faint">Sem imagem</span>}
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{card.number}</span>
                <h2 className="font-display text-2xl leading-tight">{card.name}</h2>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="text-on-variant transition hover:text-on-surface"><X /></button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

            <button disabled={busy} onClick={() => fileRef.current?.click()} className="btn-primary w-full">
              <Upload size={16} /> {url ? 'Trocar imagem' : 'Enviar imagem'}
            </button>

            <label className="flex items-center gap-2 text-sm text-on-variant">
              <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} className="accent-accent" />
              Otimizar imagem antes de enviar (WebP, máx 1600px)
            </label>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-on-faint">Proporção</label>
                <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="field">
                  {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-on-faint">Tags</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separadas, por vírgula" className="field" />
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2 pt-2">
              <button disabled={busy} onClick={saveMeta} className="btn-ghost flex-1">Salvar</button>
              <button disabled={busy} onClick={remove} aria-label="Excluir card"
                className="rounded border border-surface-bright/60 px-3 py-2 text-red-400 transition hover:bg-red-500/10"><Trash2 size={16} /></button>
            </div>
            {busy && <p className="text-sm text-on-variant">Processando…</p>}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
