import type { BookState, ScrapbookPage } from '../domain/types'
import { AlbumPaper } from './AlbumPaper'
import { SpiralBinding } from './SpiralBinding'

type Props = { state: BookState; page: ScrapbookPage | null; onAdvance: () => void; direction: 'next' | 'previous' }

export function Scrapbook({ state, page, onAdvance, direction }: Props) {
  if (state === 'CLOSED') return <button type="button" className="scrapbook-cover front-cover" onClick={onAdvance} aria-label="Abrir la libreta"><span className="cover-page-edge" aria-hidden="true" /><SpiralBinding cover /><span>BRATTYPOLITAN</span><strong>ARCHIVO<br />COLECTIVO</strong><span className="cover-mark"><img className="cover-emblem" src="/images/bratty-face-mark.png" alt="" /><b>星</b></span><span className="cover-bookmark" aria-hidden="true" /><small>clic para abrir</small></button>
  if (state === 'BACK_COVER') return <button type="button" className="scrapbook-cover back-cover" onClick={onAdvance} aria-label="Volver a abrir la libreta"><SpiralBinding cover /><span>FIN DEL PRIMER VOLUMEN</span><strong>BRATTY<br />2026</strong></button>
  if (!page) return <div className="scrapbook-loading">Preparando las páginas…</div>
  return <div key={`${state}-${page.id}`} className={`scrapbook-sheet is-turning turn-${direction}`} onClick={onAdvance}><AlbumPaper page={page} /><span className="sheet-hint">clic para continuar</span></div>
}
