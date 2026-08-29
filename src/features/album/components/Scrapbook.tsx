import type { BookState, ScrapbookPage } from '../domain/types'
import { AlbumPaper } from './AlbumPaper'
import { SpiralBinding } from './SpiralBinding'

type Props = { state: BookState; page: ScrapbookPage | null; nextPage?: ScrapbookPage | null; bookmarkPage: number; onBookmark: () => void; onAdvance: () => void; direction: 'next' | 'previous' }

export function Scrapbook({ state, page, nextPage, bookmarkPage, onBookmark, onAdvance, direction }: Props) {
  if (state === 'CLOSED') return <button type="button" className="scrapbook-cover front-cover" onClick={onAdvance} aria-label="Abrir la libreta"><span className="cover-page-edge" aria-hidden="true" /><SpiralBinding cover /><span>BRATTYPOLITAN</span><strong>ARCHIVO<br />COLECTIVO</strong><span className="cover-mark"><img className="cover-emblem" src="/images/bratty-face-mark.png" alt="" /><b>星</b></span><span className="cover-bookmark" role="button" aria-label={`Ir a página ${bookmarkPage}`} onClick={(event) => { event.stopPropagation(); onBookmark() }}><i>{bookmarkPage}</i></span><small>clic para abrir</small></button>
  if (state === 'BACK_COVER') return <button type="button" className="scrapbook-cover back-cover" onClick={onAdvance} aria-label="Volver a abrir la libreta"><SpiralBinding cover /><span>FIN DEL PRIMER VOLUMEN</span><strong>BRATTY<br />2026</strong></button>
  if (!page) return <div className="scrapbook-loading">Preparando las páginas…</div>
  return <div key={`${state}-${page.id}`} className={`scrapbook-spread is-turning turn-${direction}${page.pageNumber === 1 ? ' is-opening' : ''}`} onClick={onAdvance}>
    <div className="scrapbook-sheet scrapbook-sheet--left"><AlbumPaper page={page} bookmarkPage={bookmarkPage} showBinding={false} /></div>
    <div className="scrapbook-gutter" aria-hidden="true"><SpiralBinding /></div>
    <div className="scrapbook-sheet scrapbook-sheet--right">{nextPage ? <AlbumPaper page={nextPage} bookmarkPage={bookmarkPage} showBinding={false} /> : <div className="album-paper blank-paper" />}</div>
    <span className="sheet-hint">clic para continuar</span>
  </div>
}
