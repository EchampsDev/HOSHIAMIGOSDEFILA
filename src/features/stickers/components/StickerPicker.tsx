import { useStickerLibrary } from '../hooks/useStickerLibrary'
import { useStickerCatalog } from '../hooks/useStickerCatalog'
import type { CommunitySticker } from '../domain/types'
import { StickerGroupGrid } from './StickerGroupGrid'

export function StickerPicker({ selectedId, onSelect }: { selectedId?: string; onSelect: (sticker: CommunitySticker) => void }) {
  const library = useStickerLibrary()
  const collections = useStickerCatalog()
  return <section className="sticker-picker" aria-labelledby="sticker-picker-title">
    <div className="sticker-section-heading"><div><p className="eyebrow">BIBLIOTECA</p><h3 id="sticker-picker-title">Elige un sticker</h3></div><span>{library.approved.length} disponibles</span></div>
    {library.loading || collections.loading ? <p className="sticker-loading"><i aria-hidden="true">✦</i> Preparando stickers…</p> : library.error || collections.error ? <p role="alert">{library.error ?? collections.error}</p> : <StickerGroupGrid stickers={library.approved} catalog={collections.catalog} selectedId={selectedId} onSelect={onSelect} compact />}
  </section>
}
