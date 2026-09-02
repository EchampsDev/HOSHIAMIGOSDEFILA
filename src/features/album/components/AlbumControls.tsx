import type { BookState } from '../domain/types'

export type ReaderViewMode = 'BOOK' | 'SINGLE'
export type ReaderPaperTheme = 'CREAM' | 'BLACK'

type Props = { state: BookState; pageNumber: number; pageCount: number; bookmarkPage: number; presenting: boolean; paused: boolean; viewMode: ReaderViewMode; paperTheme: ReaderPaperTheme; onViewMode: (mode: ReaderViewMode) => void; onPaperTheme: (theme: ReaderPaperTheme) => void; onBookmarkPage: (page: number) => void; onPrevious: () => void; onNext: () => void; onIndex: () => void; onPresent: () => void; onPause: () => void; onResume: () => void }

export function AlbumControls({ state, pageNumber, pageCount, bookmarkPage, presenting, paused, viewMode, paperTheme, onViewMode, onPaperTheme, onBookmarkPage, onPrevious, onNext, onIndex, onPresent, onPause, onResume }: Props) {
  const range = pageNumber === 1 ? '1' : `${pageNumber}–${Math.min(pageNumber + 1, pageCount)}`
  const position = state === 'PAGE' ? `${viewMode === 'BOOK' ? range : pageNumber} / ${pageCount}` : state === 'CLOSED' ? 'Cerrada' : 'Contraportada'
  return <nav className="album-controls" aria-label="Controles de la libreta">
    <button type="button" onClick={onPrevious} disabled={state === 'CLOSED'}>← <span>Anterior</span></button><p>{position}</p><button type="button" onClick={onNext}><span>Siguiente</span> →</button>
    <button type="button" onClick={onIndex}>Índice</button>
    <label className="album-bookmark-picker">Marcador <select value={bookmarkPage} onChange={(event) => onBookmarkPage(Number(event.target.value))}>{Array.from({ length: pageCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
    {!presenting ? <button type="button" onClick={onPresent}>Presentación</button> : paused ? <button type="button" onClick={onResume}>Reanudar</button> : <button type="button" onClick={onPause}>Pausar</button>}
    <fieldset className="album-reader-settings"><legend>Vista</legend><button type="button" className={viewMode === 'BOOK' ? 'is-active' : ''} aria-pressed={viewMode === 'BOOK'} onClick={() => onViewMode('BOOK')}>Libreta completa</button><button type="button" className={viewMode === 'SINGLE' ? 'is-active' : ''} aria-pressed={viewMode === 'SINGLE'} onClick={() => onViewMode('SINGLE')}>Pantalla completa · una hoja</button></fieldset>
    <fieldset className="album-reader-settings"><legend>Papel</legend><button type="button" className={paperTheme === 'CREAM' ? 'is-active' : ''} aria-pressed={paperTheme === 'CREAM'} onClick={() => onPaperTheme('CREAM')}>Crema</button><button type="button" className={paperTheme === 'BLACK' ? 'is-active' : ''} aria-pressed={paperTheme === 'BLACK'} onClick={() => onPaperTheme('BLACK')}>Negro</button></fieldset>
  </nav>
}
