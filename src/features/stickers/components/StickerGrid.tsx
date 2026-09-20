import type { CommunitySticker } from '../domain/types'
import { StickerCard } from './StickerCard'

export function StickerGrid({ stickers, selectedId, favoriteIds, onSelect, onDetail, onDownload, onFavorite, compact = false }: { stickers: CommunitySticker[]; selectedId?: string; favoriteIds?: Set<string>; onSelect?: (sticker: CommunitySticker) => void; onDetail?: (sticker: CommunitySticker) => void; onDownload?: (sticker: CommunitySticker) => void; onFavorite?: (sticker: CommunitySticker) => void; compact?: boolean }) {
  if (!stickers.length) return <p className="sticker-empty">Todavía no hay stickers aprobados.</p>
  return <div className="sticker-grid" role={onSelect ? 'listbox' : 'list'} aria-label="Stickers comunitarios">
    {stickers.map((sticker) => <StickerCard key={sticker.id} sticker={sticker} selected={selectedId === sticker.id} favorite={favoriteIds?.has(sticker.id)} onSelect={onSelect} onDetail={onDetail} onDownload={onDownload} onFavorite={onFavorite} compact={compact} />)}
  </div>
}