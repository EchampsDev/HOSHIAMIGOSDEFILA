import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumControls } from './components/AlbumControls'
import { PageIndex } from './components/PageIndex'
import { Scrapbook } from './components/Scrapbook'
import { useAlbum } from './hooks/useAlbum'

export function AlbumExperiencePage() {
  const album = useAlbum()
  const [indexOpen, setIndexOpen] = useState(false)
  const [direction, setDirection] = useState<'next' | 'previous'>('next')
  const next = () => { setDirection('next'); album.next() }
  const previous = () => { setDirection('previous'); album.previous() }
  const goTo = (page: number) => { setDirection(page >= album.pageNumber ? 'next' : 'previous'); album.goTo(page) }
  const nextPage = album.album?.pages[album.pageNumber] ?? null
  return <main className="album-experience"><header className="album-header"><Link to="/">BRATTYPOLITAN EXPERIENCE</Link><p>LIBRETA DIGITAL · VOLUMEN 01</p></header><section className="album-reader"><Scrapbook state={album.bookState} page={album.currentPage} nextPage={nextPage} direction={direction} onAdvance={next} /><AlbumControls state={album.bookState} pageNumber={album.pageNumber} pageCount={album.album?.pageCount ?? 100} presenting={album.isPresenting} paused={album.isPaused} onPrevious={previous} onNext={next} onIndex={() => setIndexOpen(true)} onPresent={album.startPresentation} onPause={album.pausePresentation} onResume={album.resumePresentation} /></section><PageIndex open={indexOpen} pageCount={album.album?.pageCount ?? 100} current={album.pageNumber} onClose={() => setIndexOpen(false)} onGoTo={goTo} /><p className="album-reader-note">Una libreta hecha por fans. Cada página guarda su propia memoria.</p></main>
}
