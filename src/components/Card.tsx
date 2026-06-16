import { motion, useReducedMotion } from 'framer-motion'
import type { Card as CardType } from '../lib/catalog/types'
import { imageUrl } from '../lib/catalog/repository'

const ASPECT: Record<CardType['aspectRatio'], string> = {
  '1:1': 'aspect-square', '9:16': 'aspect-[9/16]', '3:4': 'aspect-[3/4]',
}

export function Card({ card, onOpen }: { card: CardType; onOpen: (c: CardType) => void }) {
  const url = imageUrl(card.imagePath)
  const reduce = useReducedMotion()
  return (
    <motion.button
      layout
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpen(card)}
      className={`group relative w-full overflow-hidden rounded-lg bg-surface-2 outline-none
        ring-1 ring-inset ring-white/5 transition-shadow duration-300
        hover:shadow-card focus-visible:ring-2 focus-visible:ring-accent ${ASPECT[card.aspectRatio]}`}
    >
      {url ? (
        <img src={url} alt={card.name} loading="lazy"
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]" />
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-surface-bright/50">
          <span className="font-display text-4xl tracking-tight text-on-faint/60">{card.number}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t
        from-black/80 via-black/20 to-transparent px-3 pb-2.5 pt-10">
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-accent/90">{card.number}</span>
          <span className="block truncate text-sm text-white/95">{card.name}</span>
        </div>
      </div>
    </motion.button>
  )
}
