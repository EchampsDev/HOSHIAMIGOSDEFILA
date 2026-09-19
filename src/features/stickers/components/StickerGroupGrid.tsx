import { groupStickers, type StickerCatalog } from '../domain/catalog'
import type { CommunitySticker } from '../domain/types'
import { StickerGrid } from './StickerGrid'

type Props = {
  stickers: CommunitySticker[]
  catalog: StickerCatalog
  selectedId?: string
  compact?: boolean
  onSelect?: (sticker: CommunitySticker) => void
  onDetail?: (sticker: CommunitySticker) => void
  onDownload?: (sticker: CommunitySticker) => void
}

export function StickerGroupGrid({ stickers, catalog, selectedId, compact = false, onSelect, onDetail, onDownload }: Props) {
  const sections = groupStickers(stickers, catalog)
  if (!sections.length) return <p className="sticker-empty">Todavía no hay stickers aprobados.</p>
  return <div className={`sticker-groups${compact ? ' is-compact' : ''}`}>
    {sections.map((section, index) => <details className="sticker-group" key={section.id} open={index === 0}>
      <summary><span><b>{section.name}</b><small>{section.stickers.length} {section.stickers.length === 1 ? 'sticker' : 'stickers'}</small></span><i aria-hidden="true">＋</i></summary>
      <div className="sticker-group-content"><StickerGrid stickers={section.stickers} selectedId={selectedId} onSelect={onSelect} onDetail={onDetail} onDownload={onDownload} compact={compact} /></div>
    </details>)}
  </div>
}
