import { useEffect, useState } from 'react'
import type { CommunitySticker } from '../domain/types'
import { resolveStickerAsset } from '../hooks/useStickerLibrary'

export function StickerCard({ sticker, selected = false, favorite = false, onSelect, onDetail, onDownload, onFavorite, compact = false }: { sticker: CommunitySticker; selected?: boolean; favorite?: boolean; onSelect?: (sticker: CommunitySticker) => void; onDetail?: (sticker: CommunitySticker) => void; onDownload?: (sticker: CommunitySticker) => void; onFavorite?: (sticker: CommunitySticker) => void; compact?: boolean }) {
  const [source, setSource] = useState<string | null>(null)
  useEffect(() => { let active = true; void resolveStickerAsset(sticker).then((url) => { if (active) setSource(url) }); return () => { active = false } }, [sticker])
  return <article className={`sticker-card${selected ? ' is-selected' : ''}${compact ? ' is-compact' : ''}`}>
    {onFavorite && <button type="button" className={`sticker-favorite${favorite ? ' is-favorite' : ''}`} aria-label={`${favorite ? 'Quitar' : 'Agregar'} ${sticker.title} ${favorite ? 'de' : 'a'} favoritos`} aria-pressed={favorite} onClick={() => onFavorite(sticker)}>♥</button>}
    <button type="button" className="sticker-card-art" aria-label={`${onSelect ? 'Seleccionar' : 'Ver'} ${sticker.title}`} aria-pressed={onSelect ? selected : undefined} onClick={() => onSelect ? onSelect(sticker) : onDetail?.(sticker)}>
      {source ? <img src={source} alt={sticker.title} /> : <span aria-hidden="true">✦</span>}
      {selected && <i aria-hidden="true">✓</i>}
    </button>
    <div className="sticker-card-meta"><strong>{sticker.title}</strong><small>por {sticker.authorName?.trim() || 'Autor anónimo'}</small>{!compact && <p>{sticker.description?.trim() || 'Sin descripción.'}</p>}</div>
    {!compact && <div className="sticker-card-actions"><button type="button" onClick={() => onDetail?.(sticker)}>Detalles</button><button type="button" onClick={() => onDownload?.(sticker)}>Descargar</button></div>}
  </article>
}