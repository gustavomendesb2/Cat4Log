import { motion } from 'framer-motion'
import type { Card as CardType } from '../lib/catalog/types'
import { imageUrl } from '../lib/catalog/repository'

const ASPECT: Record<CardType['aspectRatio'], string> = {
  '1:1': 'aspect-square', '9:16': 'aspect-[9/16]', '3:4': 'aspect-[3/4]',
}

export function Card({ card, onOpen }: { card: CardType; onOpen: (c: CardType) => void }) {
  const url = imageUrl(card.imagePath)
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => onOpen(card)}
      className={`group relative w-full overflow-hidden rounded bg-surface-dim ${ASPECT[card.aspectRatio]}`}
    >
      {url ? (
        <img src={url} alt={card.name} loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] group-hover:brightness-110" />
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-surface-bright/60 text-on-variant">
          <span className="font-display text-2xl opacity-40">{card.number}</span>
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
        {card.number} {card.name}
      </span>
    </motion.button>
  )
}
