import { useState } from 'react'
import { useGoogleSession } from '../../access/useGoogleSession'
import type { CommunitySticker } from '../domain/types'
import { useStickerLibrary } from '../hooks/useStickerLibrary'
import { useStickerCatalog } from '../hooks/useStickerCatalog'
import { useStickerFavorites } from '../hooks/useStickerFavorites'
import { downloadSticker } from '../services/downloadSticker'
import { StickerDetail } from './StickerDetail'
import { StickerGroupGrid } from './StickerGroupGrid'
import { StickerUploader } from './StickerUploader'

export function StickerLibrarySection() {
  const session = useGoogleSession()
  const library = useStickerLibrary()
  const collections = useStickerCatalog()
  const favorites = useStickerFavorites(session.user?.uid)
  const [detail, setDetail] = useState<CommunitySticker | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const download = async (sticker: CommunitySticker) => { try { await downloadSticker(sticker); setMessage(`Descargando ${sticker.title}.`) } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible descargar.') } }
  return <section className="community-sticker-library" id="stickers" aria-labelledby="community-sticker-title"><header><div><p className="eyebrow">STICKER LIBRARY</p><h2 id="community-sticker-title">Pequeños símbolos,<br />una memoria compartida</h2></div><p>Explora, descarga y reutiliza stickers creados para la comunidad HOSHIAMIGOS DE FILA.</p></header>
    <div className="sticker-library-tools"><p><b>{favorites.favorites.size}</b> {favorites.favorites.size === 1 ? 'favorito' : 'favoritos'} en este dispositivo</p>{session.user ? <StickerUploader defaultAuthorName={session.user.displayName ?? ''} /> : <button type="button" className="sticker-primary-action" onClick={() => void session.signIn()}>Agregar un sticker</button>}</div>
    {library.loading || collections.loading ? <p className="sticker-loading"><i aria-hidden="true">✦</i> Abriendo la colección…</p> : <StickerGroupGrid stickers={library.approved} catalog={collections.catalog} favoriteIds={favorites.favorites} onFavorite={(sticker) => favorites.toggleFavorite(sticker.id)} onDetail={setDetail} onDownload={(sticker) => void download(sticker)} />}
    {(library.error || collections.error || session.error) && <p role="alert">{library.error ?? collections.error ?? session.error}</p>}
    {message && <p className="sticker-library-status" role="status">{message}</p>}
    {detail && <StickerDetail sticker={detail} onClose={() => setDetail(null)} onDownload={(sticker) => void download(sticker)} />}
  </section>
}