import { useState } from 'react'
import type { CommunitySticker } from '../domain/types'
import { useStickerLibrary } from '../hooks/useStickerLibrary'
import { downloadSticker } from '../services/downloadSticker'
import { StickerDetail } from './StickerDetail'
import { StickerGrid } from './StickerGrid'

export function StickerLibrarySection() {
  const library = useStickerLibrary()
  const [detail, setDetail] = useState<CommunitySticker | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const download = async (sticker: CommunitySticker) => { try { await downloadSticker(sticker); setMessage(`Descargando ${sticker.title}.`) } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible descargar.') } }
  return <section className="community-sticker-library" id="stickers" aria-labelledby="community-sticker-title"><header><div><p className="eyebrow">STICKER LIBRARY</p><h2 id="community-sticker-title">Pequeños símbolos,<br />una memoria compartida</h2></div><p>Explora, descarga y reutiliza stickers creados para la comunidad HOSHIAMIGOS DE FILA.</p></header>
    {library.loading ? <p className="sticker-loading"><i aria-hidden="true">✦</i> Abriendo la colección…</p> : <StickerGrid stickers={library.approved} onDetail={setDetail} onDownload={(sticker) => void download(sticker)} />}
    {message && <p className="sticker-library-status" role="status">{message}</p>}
    {detail && <StickerDetail sticker={detail} onClose={() => setDetail(null)} onDownload={(sticker) => void download(sticker)} />}
  </section>
}
