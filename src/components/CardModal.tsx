import { useRef, useState } from 'react'
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
    <div className="fixed inset-0 z-30 grid place-items-center p-6" style={{ background: 'var(--backdrop)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded bg-surface-dim border border-surface-bright p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{card.number} {card.name}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-on-variant hover:text-on-surface"><X /></button>
        </div>

        <div className="grid place-items-center rounded bg-surface aspect-[9/16] max-h-[50vh] overflow-hidden">
          {url ? <img src={url} alt={card.name} className="h-full w-full object-contain" />
               : <span className="text-on-variant">Sem imagem</span>}
        </div>

        <label className="flex items-center gap-2 text-sm text-on-variant">
          <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} />
          Otimizar imagem antes de enviar (WebP, máx 1600px)
        </label>

        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => onFile(e.target.files?.[0])} />

        <div className="flex flex-wrap gap-2 items-center">
          <button disabled={busy} onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded bg-on-surface text-surface px-3 py-2 text-sm disabled:opacity-50">
            <Upload size={16} /> {url ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)}
            className="rounded bg-surface border border-surface-bright px-2 py-2 text-sm">
            {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separadas, por vírgula"
            className="flex-1 min-w-[12rem] rounded bg-surface border border-surface-bright px-3 py-2 text-sm" />
          <button disabled={busy} onClick={saveMeta}
            className="rounded border border-surface-bright px-3 py-2 text-sm hover:bg-surface-bright/30">Salvar</button>
          <button disabled={busy} onClick={remove} aria-label="Excluir card"
            className="rounded px-3 py-2 text-red-400 hover:bg-red-400/10"><Trash2 size={16} /></button>
        </div>
        {busy && <p className="text-sm text-on-variant">Processando…</p>}
      </div>
    </div>
  )
}
