import { useStickerLibrary } from '../hooks/useStickerLibrary'
import { StickerArtwork } from './StickerArtwork'

export function StickerModerationPanel() {
  const library = useStickerLibrary(true)
  return <section className="sticker-moderation-panel"><p>HERRAMIENTA INTERNA · STICKERS</p><h2>Stickers pendientes · {library.pending.length}</h2>
    {library.loading ? <p>Cargando aportaciones…</p> : library.pending.length ? <div className="sticker-moderation-grid">{library.pending.map((sticker) => <article key={sticker.id}><StickerArtwork stickerId={sticker.id} alt={sticker.title} /><div><strong>{sticker.title}</strong><small>{sticker.authorName ?? 'Autor anónimo'} · {Math.ceil(sticker.fileSize / 1024)} KB</small></div><button type="button" onClick={() => void library.updateStatus(sticker.id, 'APPROVED')}>Aprobar y publicar</button><button type="button" onClick={() => void library.updateStatus(sticker.id, 'REJECTED')}>Rechazar</button></article>)}</div> : <p>No hay stickers pendientes.</p>}
    {library.error && <p role="alert">{library.error}</p>}
  </section>
}
