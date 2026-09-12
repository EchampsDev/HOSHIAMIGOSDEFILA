import { useEffect, useState } from 'react'
import type { CommunitySticker } from '../domain/types'
import { resolveStickerAsset } from '../hooks/useStickerLibrary'

export function StickerDetail({ sticker, onClose, onDownload }: { sticker: CommunitySticker; onClose: () => void; onDownload: (sticker: CommunitySticker) => void }) {
  const [source, setSource] = useState<string | null>(null)
  useEffect(() => { void resolveStickerAsset(sticker).then(setSource) }, [sticker])
  return <div className="sticker-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="sticker-detail" role="dialog" aria-modal="true" aria-labelledby="sticker-detail-title">
      <button type="button" className="sticker-detail-close" aria-label="Cerrar detalle" onClick={onClose}>×</button>
      <div className="sticker-detail-art">{source && <img src={source} alt={sticker.title} />}</div>
      <p className="eyebrow">STICKER COMUNITARIO</p><h2 id="sticker-detail-title">{sticker.title}</h2>
      {sticker.authorName && <p>Creado por {sticker.authorName}</p>}{sticker.description && <p>{sticker.description}</p>}
      <small>{sticker.originalWidth} × {sticker.originalHeight} px · {Math.ceil(sticker.fileSize / 1024)} KB</small>
      <button type="button" className="sticker-primary-action" onClick={() => onDownload(sticker)}>Descargar PNG/WEBP</button>
    </section>
  </div>
}
