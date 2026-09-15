import { useEffect, useState } from 'react'
import { isElementOwner, type AlbumElement, type ScrapbookPage, type SetlistEntry } from '../domain/types'
import { readSetlistTracks, type SetlistTrack } from '../data/localSetlistCatalog'
import { resolveSetlistCoverUrl, setlistCatalogRepository } from '../repositories/SetlistCatalogRepository'
import { SpiralBinding } from './SpiralBinding'
import { StickerArtwork } from '../../stickers/components/StickerArtwork'
import { PhotoArtwork } from '../../media/components/PhotoArtwork'
import type { ElementReactions } from '../../reactions/repositories/ElementReactionRepository'

type GestureMode = 'move' | 'resize' | 'rotate'
type Props = { page: ScrapbookPage; bookmarkPage?: number; selectedId?: string | null; editable?: boolean; canEditAll?: boolean; viewerId?: string | null; revealAll?: boolean; canInspectAll?: boolean; reactionsByElement?: ElementReactions; showBinding?: boolean; onSelect?: (id: string) => void; onLike?: (element: AlbumElement) => void; onElementPointerDown?: (event: React.PointerEvent<HTMLDivElement>, element: AlbumElement, mode: GestureMode) => void; onBackgroundPointerDown?: () => void }
const isLegacySetlist = (element: AlbumElement) => element.type === 'TEXT' && /(?:MI|ADIVINA LA) SETLIST/i.test(element.content ?? '')
const tracksFromLegacyText = (content: string | undefined, catalog: SetlistTrack[]): SetlistEntry[] => (content?.match(/^\s*\d{1,2}\.\s*.+$/gm) ?? []).map((line, index) => {
  const title = line.replace(/^\s*\d{1,2}\.\s*/, '').trim()
  const match = catalog.find((track) => track.title.trim().toLowerCase() === title.toLowerCase())
  return { id: match?.id ?? `legacy-track-${index}-${title}`, title, coverUrl: match?.coverUrl }
})

export function AlbumPaper({ page, bookmarkPage, selectedId, editable = false, canEditAll = false, viewerId, revealAll = editable, canInspectAll = false, reactionsByElement, showBinding = true, onSelect, onLike, onElementPointerDown, onBackgroundPointerDown }: Props) {
  const [catalog, setCatalog] = useState<SetlistTrack[]>(readSetlistTracks)
  useEffect(() => setlistCatalogRepository.subscribe(setCatalog, () => undefined), [])
  return <article className={`album-paper ${page.paperType.toLowerCase()}`} onPointerDown={(event) => { if (event.target === event.currentTarget) onBackgroundPointerDown?.() }}>
    {showBinding && <SpiralBinding />}
    {bookmarkPage === page.pageNumber && <span className="album-page-bookmark" aria-hidden="true"><i>{page.pageNumber}</i></span>}
    <p className="album-page-number" aria-label={`Página ${page.pageNumber}`}>{page.pageNumber}</p>
    {page.title && <p className="album-page-title">{page.title}</p>}
    {page.elements.filter((element) => !element.layout.hidden).map((element) => {
      const owned = isElementOwner(element, viewerId)
      const canEdit = editable && selectedId === element.id && (canEditAll || owned || !viewerId)
      const concealed = element.visibility === 'PRIVATE' && !revealAll && !owned
      const canSelect = Boolean(onSelect) && (!concealed || owned || canInspectAll)
      const likedBy = reactionsByElement?.[element.id] ?? (element.likedBy ?? []).map((userId) => ({ userId, displayName: 'Anónimo' }))
      const setlist = element.type === 'SETLIST' ? element.setlist ?? [] : tracksFromLegacyText(element.content, catalog)
      const setlistLike = element.type === 'SETLIST' || isLegacySetlist(element)
      const firstCover = setlist[0]?.coverUrl
      const layout = setlistLike && element.type !== 'SETLIST' ? { ...element.layout, width: Math.max(.74, element.layout.width), height: Math.max(.31, element.layout.height) } : element.layout
      return <div key={element.id} className={`album-element ${setlistLike ? 'type-setlist' : `type-${element.type.toLowerCase()}`}${element.type === 'POST_IT' ? ` postit-${element.styleVariant ?? 'yellow'}` : ''}${selectedId === element.id ? ' is-selected' : ''}${canEdit ? ' is-editing' : ''}${element.layout.locked ? ' is-locked' : ''}${concealed ? ' is-concealed' : ''}${owned ? ' is-owned' : ''}`} style={{ left: `${layout.x * 100}%`, top: `${layout.y * 100}%`, width: `${layout.width * 100}%`, height: `${layout.height * 100}%`, transform: `rotate(${layout.rotation}deg)`, zIndex: layout.zIndex, ...(firstCover && !concealed ? { '--setlist-blur': `url(${resolveSetlistCoverUrl(firstCover)}) center / cover no-repeat` } : {}) } as React.CSSProperties} onPointerDown={(event) => { if (!canEdit) return; event.stopPropagation(); onSelect?.(element.id); onElementPointerDown?.(event, element, 'move') }} onClick={(event) => { if (canEdit || canSelect) { event.stopPropagation(); onSelect?.(element.id) } }}>
        {concealed ? <span className="album-element-silhouette" aria-label="Recuerdo de otra persona; contenido oculto"><i aria-hidden="true" /></span> : element.type === 'STICKER' && element.stickerId ? <StickerArtwork stickerId={element.stickerId} alt={element.content} className="album-sticker-image" /> : setlistLike ? <><span className="album-element-type">BRATTYPOLITAN · {element.content ?? 'MI TOP 3'}</span><div className="album-setlist-tracks">{setlist.map((track, index) => <span className="album-setlist-track" key={track.id}><i style={track.coverUrl ? { backgroundImage: `url(${resolveSetlistCoverUrl(track.coverUrl)})` } : undefined} /><b>{String(index + 1).padStart(2, '0')}</b><em>{track.title}</em></span>)}</div></> : <><span className="album-element-type">{element.type.replace('_', ' ')}</span>{element.type === 'PHOTO' && <PhotoArtwork className="album-photo-image" media={element.media} legacyContent={element.content} alt="Recuerdo compartido" />}{element.type === 'PHOTO' && !element.media && !element.content?.startsWith('data:image/') && <span className="album-photo-frame" aria-hidden="true" />}{element.type === 'PHOTO' && element.media && element.content?.trim() && <span className="album-element-content">{element.content}</span>}{element.type !== 'PHOTO' && <span className="album-element-content">{element.content}</span>}</>}
        {!concealed && selectedId === element.id && (element.author.displayName || element.author.participantId) && <span className="album-element-author" title={element.author.participantId}>{element.author.displayName ?? 'Anónimo'} · ID {element.author.participantId.slice(0, 9)} · {new Date(element.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
        {onLike && selectedId === element.id && <button type="button" className={`album-like-button${likedBy.some((reaction) => reaction.userId === viewerId) ? ' is-liked' : ''}`} aria-label="Me gusta" aria-pressed={likedBy.some((reaction) => reaction.userId === viewerId)} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onLike(element) }}>♥ <span>{likedBy.length}</span></button>}
        {canEdit && <><button type="button" className="album-rotate-handle" aria-label={`Rotar ${element.content ?? element.type}`} onPointerDown={(event) => { event.stopPropagation(); onElementPointerDown?.(event as unknown as React.PointerEvent<HTMLDivElement>, element, 'rotate') }} /><button type="button" className="album-resize-handle" aria-label={`Redimensionar ${element.content ?? element.type}`} onPointerDown={(event) => { event.stopPropagation(); onElementPointerDown?.(event as unknown as React.PointerEvent<HTMLDivElement>, element, 'resize') }} /></>}
      </div>
    })}
  </article>
}
