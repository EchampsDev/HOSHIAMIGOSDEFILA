import { useStickerLibrary } from '../hooks/useStickerLibrary'
import type { CommunitySticker } from '../domain/types'
import { StickerGrid } from './StickerGrid'

export function StickerPicker({ selectedId, onSelect }: { selectedId?: string; onSelect: (sticker: CommunitySticker) => void }) {
  const library = useStickerLibrary()
  return <section className="sticker-picker" aria-labelledby="sticker-picker-title">
    <div className="sticker-section-heading"><div><p className="eyebrow">BIBLIOTECA</p><h3 id="sticker-picker-title">Elige un sticker</h3></div><span>{library.approved.length} disponibles</span></div>
    {library.loading ? <p className="sticker-loading"><i aria-hidden="true">✦</i> Preparando stickers…</p> : library.error ? <p role="alert">{library.error}</p> : <StickerGrid stickers={library.approved} selectedId={selectedId} onSelect={onSelect} compact />}
  </section>
}
