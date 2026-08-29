import type { AlbumElement, ScrapbookPage } from '../domain/types'
import { SpiralBinding } from './SpiralBinding'

type Props = { page: ScrapbookPage; bookmarkPage?: number; selectedId?: string | null; editable?: boolean; showBinding?: boolean; onSelect?: (id: string) => void; onElementPointerDown?: (event: React.PointerEvent<HTMLDivElement>, element: AlbumElement, mode: 'move' | 'resize') => void; onBackgroundPointerDown?: () => void }

export function AlbumPaper({ page, bookmarkPage, selectedId, editable = false, showBinding = true, onSelect, onElementPointerDown, onBackgroundPointerDown }: Props) {
  return <article className={`album-paper ${page.paperType.toLowerCase()}`} onPointerDown={(event) => { if (event.target === event.currentTarget) onBackgroundPointerDown?.() }}>{showBinding && <SpiralBinding />}
    {bookmarkPage === page.pageNumber && <span className="album-page-bookmark" aria-hidden="true"><i>{page.pageNumber}</i></span>}
    <p className="album-page-number" aria-label={`Página ${page.pageNumber}`}>{page.pageNumber}</p>
    {page.title && <p className="album-page-title">{page.title}</p>}
    {page.elements.filter((element) => !element.layout.hidden).map((element) => <div key={element.id} className={`album-element type-${element.type.toLowerCase()}${selectedId === element.id ? ' is-selected' : ''}${element.layout.locked ? ' is-locked' : ''}`} style={{ left: `${element.layout.x * 100}%`, top: `${element.layout.y * 100}%`, width: `${element.layout.width * 100}%`, height: `${element.layout.height * 100}%`, transform: `rotate(${element.layout.rotation}deg)`, zIndex: element.layout.zIndex }} onPointerDown={(event) => { if (!editable) return; event.stopPropagation(); onSelect?.(element.id); onElementPointerDown?.(event, element, 'move') }} onClick={(event) => { if (editable) event.stopPropagation(); onSelect?.(element.id) }}>
      <span className="album-element-type">{element.type.replace('_', ' ')}</span>{element.type === 'PHOTO' && (element.content?.startsWith('data:image/') ? <img className="album-photo-image" src={element.content} alt="Recuerdo compartido" /> : <span className="album-photo-frame" aria-hidden="true" />)}{element.type !== 'PHOTO' && <span className="album-element-content">{element.content}</span>}{element.author.displayName && <span className="album-element-author">{element.author.displayName}</span>}
      {editable && <button type="button" className="album-resize-handle" aria-label={`Redimensionar ${element.content ?? element.type}`} onPointerDown={(event) => { event.stopPropagation(); onElementPointerDown?.(event as unknown as React.PointerEvent<HTMLDivElement>, element, 'resize') }} />}
    </div>)}
  </article>
}
