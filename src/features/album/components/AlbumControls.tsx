import type { BookState } from '../domain/types'

type Props = { state: BookState; pageNumber: number; pageCount: number; bookmarkPage: number; presenting: boolean; paused: boolean; onBookmarkPage: (page: number) => void; onPrevious: () => void; onNext: () => void; onIndex: () => void; onPresent: () => void; onPause: () => void; onResume: () => void }

export function AlbumControls({ state, pageNumber, pageCount, bookmarkPage, presenting, paused, onBookmarkPage, onPrevious, onNext, onIndex, onPresent, onPause, onResume }: Props) {
  const position = state === 'PAGE' ? `${pageNumber}–${Math.min(pageNumber + 1, pageCount)} / ${pageCount}` : state === 'CLOSED' ? 'Cerrada' : 'Contraportada'
  return <nav className="album-controls" aria-label="Controles de la libreta">
    <button type="button" onClick={onPrevious} disabled={state === 'CLOSED'}>← <span>Anterior</span></button><p>{position}</p><button type="button" onClick={onNext}><span>Siguiente</span> →</button>
    <button type="button" onClick={onIndex}>Índice</button>
    <label className="album-bookmark-picker">Marcador <select value={bookmarkPage} onChange={(event) => onBookmarkPage(Number(event.target.value))}>{Array.from({ length: pageCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
    {!presenting ? <button type="button" onClick={onPresent}>Presentación</button> : paused ? <button type="button" onClick={onResume}>Reanudar</button> : <button type="button" onClick={onPause}>Pausar</button>}
  </nav>
}
