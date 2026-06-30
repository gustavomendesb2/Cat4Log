import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X, Upload, Trash2, Settings2 } from 'lucide-react'
import type { AspectRatio, Card } from '../lib/catalog/types'
import { deleteCard, imageUrl, updateCard, uploadCardImage } from '../lib/catalog/repository'
import { useAuth } from '../auth/authContext'

const RATIOS: AspectRatio[] = ['1:1', '9:16', '3:4']

export function CardModal({ card, onClose, onChanged }: {
  card: Card; onClose: () => void; onChanged: () => void
}) {
  const { session } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [tags, setTags] = useState(card.tags.join(', '))
  const [ratio, setRatio] = useState<AspectRatio>(card.aspectRatio)
  const [editing, setEditing] = useState(!card.imagePath)
  const reduce = useReducedMotion()
  const url = imageUrl(card.imagePath)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    await uploadCardImage(card, file, false)
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
        className="modal-card relative !w-auto max-w-[92vw] overflow-hidden sm:max-w-[96vw]" onClick={(e) => e.stopPropagation()}>

        {url ? (
          <img src={url} alt={card.name} className="block max-h-[88vh] w-auto max-w-[92vw] object-contain sm:h-[92dvh] sm:max-h-[92dvh] sm:max-w-[96vw]" />
        ) : (
          <div className="grid aspect-[9/16] w-[min(80vw,360px)] place-items-center bg-surface-dim text-on-faint">Sem imagem</div>
        )}

        {/* legenda */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-4 pt-12">
          <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-accent">{card.number}</span>
          <h2 className="font-display text-2xl leading-tight text-white">{card.name}</h2>
        </div>

        {/* painel de edição — só para autenticados */}
        {session && (
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-10 flex flex-col justify-end gap-4 overflow-y-auto bg-black/60 p-5 backdrop-blur-md">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

                <button disabled={busy} onClick={() => fileRef.current?.click()} className="btn-primary w-full">
                  <Upload size={16} /> {url ? 'Trocar imagem' : 'Enviar imagem'}
                </button>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Proporção</label>
                    <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="field">
                      {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Tags</label>
                    <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separadas, por vírgula" className="field" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button disabled={busy} onClick={saveMeta} className="btn-primary flex-1">Salvar</button>
                  <button disabled={busy} onClick={remove} aria-label="Excluir card"
                    className="rounded border border-white/20 px-3 py-2 text-red-400 transition hover:bg-red-500/10"><Trash2 size={16} /></button>
                </div>
                {busy && <p className="text-sm text-white/70">Processando…</p>}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* controles superiores */}
        <div className="absolute right-3 top-3 z-20 flex gap-2">
          {session && (
            <button onClick={() => setEditing((v) => !v)} aria-label={editing ? 'Fechar edição' : 'Editar'}
              className={`grid h-8 w-8 place-items-center rounded-full backdrop-blur-sm transition
                ${editing ? 'bg-accent text-surface-dim' : 'bg-black/30 text-white/75 hover:bg-black/55 hover:text-white'}`}>
              <Settings2 size={16} />
            </button>
          )}
          <button onClick={onClose} aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white/75 backdrop-blur-sm transition hover:bg-black/55 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
