import { useState } from 'react'
import type { CommunitySticker } from '../domain/types'
import { useStickerLibrary } from '../hooks/useStickerLibrary'
import { useStickerCatalog } from '../hooks/useStickerCatalog'
import { downloadSticker } from '../services/downloadSticker'
import { StickerDetail } from './StickerDetail'
import { StickerGroupGrid } from './StickerGroupGrid'

export function StickerLibrarySection() {
  const library = useStickerLibrary()
  const collections = useStickerCatalog()
  const [detail, setDetail] = useState<CommunitySticker | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const download = async (sticker: CommunitySticker) => { try { await downloadSticker(sticker); setMessage(`Descargando ${sticker.title}.`) } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible descargar.') } }
  return <section className="community-sticker-library" id="stickers" aria-labelledby="community-sticker-title"><header><div><p className="eyebrow">STICKER LIBRARY</p><h2 id="community-sticker-title">Pequeños símbolos,<br />una memoria compartida</h2></div><p>Explora, descarga y reutiliza stickers creados para la comunidad HOSHIAMIGOS DE FILA.</p></header>
    {library.loading || collections.loading ? <p className="sticker-loading"><i aria-hidden="true">✦</i> Abriendo la colección…</p> : <StickerGroupGrid stickers={library.approved} catalog={collections.catalog} onDetail={setDetail} onDownload={(sticker) => void download(sticker)} />}
    {(library.error || collections.error) && <p role="alert">{library.error ?? collections.error}</p>}
    {message && <p className="sticker-library-status" role="status">{message}</p>}
    {detail && <StickerDetail sticker={detail} onClose={() => setDetail(null)} onDownload={(sticker) => void download(sticker)} />}
  </section>
}
