import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlbumControls } from './components/AlbumControls'
import { PageIndex } from './components/PageIndex'
import { Scrapbook } from './components/Scrapbook'
import { useAlbum } from './hooks/useAlbum'

export function AlbumExperiencePage() {
  // Mientras la captura de participantes está en pruebas, la vista pública
  // consulta el mismo repositorio local donde se escriben los recuerdos.
  const album = useAlbum(true)
  const [indexOpen, setIndexOpen] = useState(false)
  const [direction, setDirection] = useState<'next' | 'previous'>('next')
  const [bookmarkPage, setBookmarkPage] = useState(() => Number(localStorage.getItem('brattypolitan.album-bookmark-page')) || 1)
  useEffect(() => {
    const target = Number(new URLSearchParams(window.location.search).get('page'))
    if (target > 0) album.goTo(target)
  }, [album.album])
  const next = () => { setDirection('next'); album.next() }
  const previous = () => { setDirection('previous'); album.previous() }
  const goTo = (page: number) => { setDirection(page >= album.pageNumber ? 'next' : 'previous'); album.goTo(page) }
  const setBookmark = (page: number) => { setBookmarkPage(page); localStorage.setItem('brattypolitan.album-bookmark-page', String(page)) }
  const nextPage = album.album?.pages[album.pageNumber] ?? null
  return <main className="album-experience"><header className="album-header"><Link to="/">BRATTYPOLITAN EXPERIENCE</Link><p>LIBRETA DIGITAL · VOLUMEN 01</p></header><section className="album-reader"><Scrapbook state={album.bookState} page={album.currentPage} nextPage={nextPage} bookmarkPage={bookmarkPage} onBookmark={() => goTo(bookmarkPage)} direction={direction} onAdvance={next} /><AlbumControls state={album.bookState} pageNumber={album.pageNumber} pageCount={album.album?.pageCount ?? 100} bookmarkPage={bookmarkPage} onBookmarkPage={setBookmark} presenting={album.isPresenting} paused={album.isPaused} onPrevious={previous} onNext={next} onIndex={() => setIndexOpen(true)} onPresent={album.startPresentation} onPause={album.pausePresentation} onResume={album.resumePresentation} /></section><PageIndex open={indexOpen} pageCount={album.album?.pageCount ?? 100} current={album.pageNumber} onClose={() => setIndexOpen(false)} onGoTo={goTo} /><p className="album-reader-note">Una libreta hecha por fans. Cada página guarda su propia memoria.</p></main>
}
