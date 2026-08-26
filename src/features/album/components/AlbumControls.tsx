import type { BookState } from '../domain/types'

type Props = { state: BookState; pageNumber: number; pageCount: number; presenting: boolean; paused: boolean; onPrevious: () => void; onNext: () => void; onIndex: () => void; onPresent: () => void; onPause: () => void; onResume: () => void }
export function AlbumControls({ state, pageNumber, pageCount, presenting, paused, onPrevious, onNext, onIndex, onPresent, onPause, onResume }: Props) {
  return <nav className="album-controls" aria-label="Controles de la libreta"><button type="button" onClick={onPrevious} disabled={state === 'CLOSED'}>← <span>Anterior</span></button><p>{state === 'PAGE' ? `${pageNumber} / ${pageCount}` : state === 'CLOSED' ? 'Cerrada' : 'Contraportada'}</p><button type="button" onClick={onNext}> <span>Siguiente</span> →</button><button type="button" onClick={onIndex}>Índice</button>{!presenting ? <button type="button" onClick={onPresent}>Presentación</button> : paused ? <button type="button" onClick={onResume}>Reanudar</button> : <button type="button" onClick={onPause}>Pausar</button>}</nav>
}
