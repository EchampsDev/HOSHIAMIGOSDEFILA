import { useEffect, useState } from 'react'
import { isElementOwner, type AlbumElement, type ScrapbookPage, type SetlistEntry } from '../domain/types'
import { readSetlistTracks, type SetlistTrack } from '../data/localSetlistCatalog'
import { resolveSetlistCoverUrl, setlistCatalogRepository } from '../repositories/SetlistCatalogRepository'
import { SpiralBinding } from './SpiralBinding'

type GestureMode = 'move' | 'resize' | 'rotate'
type Props = { page: ScrapbookPage; bookmarkPage?: number; selectedId?: string | null; editable?: boolean; viewerId?: string | null; revealAll?: boolean; showBinding?: boolean; onSelect?: (id: string) => void; onLike?: (element: AlbumElement) => void; onElementPointerDown?: (event: React.PointerEvent<HTMLDivElement>, element: AlbumElement, mode: GestureMode) => void; onBackgroundPointerDown?: () => void }
const isLegacySetlist = (element: AlbumElement) => element.type === 'TEXT' && /(?:MI|ADIVINA LA) SETLIST/i.test(element.content ?? '')
const tracksFromLegacyText = (content: string | undefined, catalog: SetlistTrack[]): SetlistEntry[] => (content?.match(/^\s*\d{1,2}\.\s*.+$/gm) ?? []).map((line, index) => {
  const title = line.replace(/^\s*\d{1,2}\.\s*/, '').trim()
  const match = catalog.find((track) => track.title.trim().toLowerCase() === title.toLowerCase())
  return { id: match?.id ?? `legacy-track-${index}-${title}`, title, coverUrl: match?.coverUrl }
})

export function AlbumPaper({ page, bookmarkPage, selectedId, editable = false, viewerId, revealAll = editable, showBinding = true, onSelect, onLike, onElementPointerDown, onBackgroundPointerDown }: Props) {
  const [catalog, setCatalog] = useState<SetlistTrack[]>(readSetlistTracks)
  useEffect(() => setlistCatalogRepository.subscribe(setCatalog, () => undefined), [])
  return <article className={`album-paper ${page.paperType.toLowerCase()}`} onPointerDown={(event) => { if (event.target === event.currentTarget) onBackgroundPointerDown?.() }}>
    {showBinding && <SpiralBinding />}
    {bookmarkPage === page.pageNumber && <span className="album-page-bookmark" aria-hidden="true"><i>{page.pageNumber}</i></span>}
    <p className="album-page-number" aria-label={`Página ${page.pageNumber}`}>{page.pageNumber}</p>
    {page.title && <p className="album-page-title">{page.title}</p>}
    {page.elements.filter((element) => !element.layout.hidden).map((element) => {
      const owned = isElementOwner(element, viewerId)
      const canEdit = editable && (owned || !viewerId)
      const concealed = !revealAll && !owned && !element.contentRevealed
      const setlist = element.type === 'SETLIST' ? element.setlist ?? [] : tracksFromLegacyText(element.content, catalog)
      const setlistLike = element.type === 'SETLIST' || isLegacySetlist(element)
      const firstCover = setlist[0]?.coverUrl
      const layout = setlistLike && element.type !== 'SETLIST' ? { ...element.layout, width: Math.max(.74, element.layout.width), height: Math.max(.31, element.layout.height) } : element.layout
      return <div key={element.id} className={`album-element ${setlistLike ? 'type-setlist' : `type-${element.type.toLowerCase()}`}${element.type === 'POST_IT' ? ` postit-${element.styleVariant ?? 'yellow'}` : ''}${selectedId === element.id ? ' is-selected' : ''}${element.layout.locked ? ' is-locked' : ''}${concealed ? ' is-concealed' : ''}${owned ? ' is-owned' : ''}`} style={{ left: `${layout.x * 100}%`, top: `${layout.y * 100}%`, width: `${layout.width * 100}%`, height: `${layout.height * 100}%`, transform: `rotate(${layout.rotation}deg)`, zIndex: layout.zIndex, ...(firstCover && !concealed ? { '--setlist-blur': `url(${resolveSetlistCoverUrl(firstCover)}) center / cover no-repeat` } : {}) } as React.CSSProperties} onPointerDown={(event) => { if (!canEdit) return; event.stopPropagation(); onSelect?.(element.id); onElementPointerDown?.(event, element, 'move') }} onClick={(event) => { if (canEdit) { event.stopPropagation(); onSelect?.(element.id) } }}>
        {concealed ? <span className="album-element-silhouette" aria-label="Recuerdo de otra persona; contenido oculto"><i aria-hidden="true" /></span> : setlistLike ? <><span className="album-element-type">BRATTYPOLITAN · {element.content ?? 'MI TOP 3'}</span><div className="album-setlist-tracks">{setlist.map((track, index) => <span className="album-setlist-track" key={track.id}><i style={track.coverUrl ? { backgroundImage: `url(${resolveSetlistCoverUrl(track.coverUrl)})` } : undefined} /><b>{String(index + 1).padStart(2, '0')}</b><em>{track.title}</em></span>)}</div></> : <><span className="album-element-type">{element.type.replace('_', ' ')}</span>{element.type === 'PHOTO' && (element.content?.startsWith('data:image/') ? <img className="album-photo-image" src={element.content} alt="Recuerdo compartido" /> : <span className="album-photo-frame" aria-hidden="true" />)}{element.type !== 'PHOTO' && <span className="album-element-content">{element.content}</span>}</>}
        {!concealed && (element.author.displayName || element.author.participantId) && <span className="album-element-author" title={element.author.participantId}>{element.author.displayName ?? 'Anónimo'} · ID {element.author.participantId.slice(0, 9)} · {new Date(element.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
        {onLike && <button type="button" className={`album-like-button${element.likedBy?.includes(viewerId ?? '') ? ' is-liked' : ''}`} aria-label="Me gusta" aria-pressed={element.likedBy?.includes(viewerId ?? '')} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onLike(element) }}>♥ <span>{element.likedBy?.length ?? 0}</span></button>}
        {canEdit && <><button type="button" className="album-rotate-handle" aria-label={`Rotar ${element.content ?? element.type}`} onPointerDown={(event) => { event.stopPropagation(); onElementPointerDown?.(event as unknown as React.PointerEvent<HTMLDivElement>, element, 'rotate') }} /><button type="button" className="album-resize-handle" aria-label={`Redimensionar ${element.content ?? element.type}`} onPointerDown={(event) => { event.stopPropagation(); onElementPointerDown?.(event as unknown as React.PointerEvent<HTMLDivElement>, element, 'resize') }} /></>}
      </div>
    })}
  </article>
}
