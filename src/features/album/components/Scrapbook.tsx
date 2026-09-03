import type { AlbumElement, BookState, ScrapbookPage } from '../domain/types'
import { AlbumPaper } from './AlbumPaper'
import { SpiralBinding } from './SpiralBinding'
import type { ReaderPaperTheme, ReaderViewMode } from './AlbumControls'

type GestureMode = 'move' | 'resize' | 'rotate'
type Props = { state: BookState; page: ScrapbookPage | null; leftPage?: ScrapbookPage | null; rightPage?: ScrapbookPage | null; bookmarkPage: number; viewerId?: string | null; selectedId?: string | null; editable?: boolean; revealAll?: boolean; navigationLocked?: boolean; viewMode: ReaderViewMode; paperTheme: ReaderPaperTheme; onBookmark: () => void; onPrevious: () => void; onNext: () => void; onSelect?: (pageId: string, id: string) => void; onLike?: (pageId: string, element: AlbumElement) => void; onElementPointerDown?: (event: React.PointerEvent<HTMLDivElement>, pageId: string, element: AlbumElement, mode: GestureMode) => void; direction: 'next' | 'previous' }

export function ScrapbookCoverArtwork({ bookmarkPage, onBookmark }: { bookmarkPage: number; onBookmark?: () => void }) {
  const markerSide = bookmarkPage % 2 === 0 ? 'left' : 'right'
  return <><span className="cover-page-edge" aria-hidden="true" /><SpiralBinding cover /><span>BRATTYPOLITAN</span><strong>Historias<br />Que inspiran</strong><span className="cover-hoshi-message"><i className="four-point-star cover-four-point-star is-active" aria-hidden="true"><i className="four-point-star__core" /></i><b>Hoshi sigue brillando</b></span><span className="cover-mark"><i className="cover-footer-mark" aria-hidden="true" /></span><span className={`cover-bookmark marker-${markerSide}`} role={onBookmark ? 'button' : undefined} aria-label={onBookmark ? `Ir a página ${bookmarkPage}` : undefined} onClick={(event) => { if (!onBookmark) return; event.stopPropagation(); onBookmark() }}><i>{bookmarkPage}</i></span><small>clic para abrir</small></>
}

export function Scrapbook({ state, page, leftPage, rightPage, bookmarkPage, viewerId, selectedId, editable, revealAll, navigationLocked = false, viewMode, paperTheme, onBookmark, onPrevious, onNext, onSelect, onLike, onElementPointerDown, direction }: Props) {
  const paper = (item: ScrapbookPage) => <><AlbumPaper page={item} viewerId={viewerId} selectedId={selectedId} editable={editable} revealAll={revealAll} showBinding={false} onSelect={(id) => onSelect?.(item.id, id)} onLike={(element) => onLike?.(item.id, element)} onElementPointerDown={(event, element, mode) => onElementPointerDown?.(event, item.id, element, mode)} />{bookmarkPage === item.pageNumber && <span className="album-page-bookmark" aria-hidden="true"><i>{item.pageNumber}</i></span>}</>
  const coverMessage = <span className="cover-hoshi-message"><i className="four-point-star cover-four-point-star is-active" aria-hidden="true"><i className="four-point-star__core" /></i><b>Hoshi sigue brillando</b></span>
  const markerSide = bookmarkPage % 2 === 0 ? 'left' : 'right'
  const bookmarkTail = <span className={`album-bookmark-tail marker-${markerSide}`} aria-hidden="true"><i>{bookmarkPage}</i></span>
  if (state === 'CLOSED') return <button type="button" className="scrapbook-cover front-cover" onClick={onNext} aria-label="Abrir la libreta"><ScrapbookCoverArtwork bookmarkPage={bookmarkPage} onBookmark={onBookmark} /></button>
  if (state === 'BACK_COVER') return <button type="button" className="scrapbook-cover back-cover" onClick={onPrevious} aria-label="Volver a la última hoja"><SpiralBinding cover /><span>FIN DEL PRIMER VOLUMEN</span><strong>BRATTY<br />2026</strong>{coverMessage}{bookmarkTail}</button>
  if (!page) return <div className="scrapbook-loading">Preparando las páginas…</div>
  if (viewMode === 'SINGLE') return <div key={`${state}-${page.id}`} className={`scrapbook-single scrapbook-theme-${paperTheme.toLowerCase()} is-turning turn-${direction}${navigationLocked ? ' is-editing' : ''}`}><div className="scrapbook-sheet scrapbook-sheet--single" role="button" tabIndex={0} aria-label={`Hoja ${page.pageNumber}. Toca el lado izquierdo para retroceder o el derecho para avanzar.`} onClick={(event) => { if (navigationLocked) return; const bounds = event.currentTarget.getBoundingClientRect(); (event.clientX - bounds.left) < bounds.width / 2 ? onPrevious() : onNext() }} onKeyDown={(event) => { if (navigationLocked) return; if (event.key === 'ArrowLeft') onPrevious(); if (event.key === 'ArrowRight') onNext() }}>{paper(page)}</div>{bookmarkPage !== page.pageNumber && bookmarkTail}</div>
  const bookmarkIsVisible = leftPage?.pageNumber === bookmarkPage || rightPage?.pageNumber === bookmarkPage
  return <div key={`${state}-${leftPage?.id ?? 'cover'}-${rightPage?.id ?? 'blank'}`} className={`scrapbook-spread scrapbook-theme-${paperTheme.toLowerCase()} is-turning turn-${direction}${page.pageNumber === 1 ? ' is-opening is-first-open' : ''}${navigationLocked ? ' is-editing' : ''}`}>
    <div className={`scrapbook-sheet scrapbook-sheet--left${leftPage ? '' : ' scrapbook-open-cover'}`} role="button" tabIndex={0} aria-label="Retroceder una hoja" onClick={() => { if (!navigationLocked) onPrevious() }} onKeyDown={(event) => { if (!navigationLocked && (event.key === 'Enter' || event.key === ' ')) onPrevious() }}>{leftPage ? paper(leftPage) : <div className="open-cover-panel"><span>BRATTYPOLITAN · VOLUMEN 01</span>{coverMessage}<small>La historia comienza aquí</small></div>}</div>
    <div className="scrapbook-gutter" aria-hidden="true"><SpiralBinding /></div>
    <div className="scrapbook-sheet scrapbook-sheet--right" role="button" tabIndex={0} aria-label="Avanzar una hoja" onClick={() => { if (!navigationLocked) onNext() }} onKeyDown={(event) => { if (!navigationLocked && (event.key === 'Enter' || event.key === ' ')) onNext() }}>{rightPage ? paper(rightPage) : <div className="album-paper blank-paper" />}</div>
    {!bookmarkIsVisible && bookmarkTail}
  </div>
}
