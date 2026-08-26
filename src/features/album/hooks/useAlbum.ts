import { useCallback, useEffect, useMemo, useState } from 'react'
import { createElement, clampLayout, type AlbumElement, type AlbumElementType, type AlbumDocument, type AuthorIdentity, type BookState, type ElementLayout, type PaperType, type ScrapbookPage } from '../domain/types'
import { LocalAlbumRepository } from '../repositories/LocalAlbumRepository'

export function useAlbum() {
  const repository = useMemo(() => new LocalAlbumRepository(), [])
  const [album, setAlbum] = useState<AlbumDocument | null>(null)
  const [bookState, setBookState] = useState<BookState>('CLOSED')
  const [pageNumber, setPageNumber] = useState(1)
  const [isPresenting, setIsPresenting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => { void repository.getAlbum().then(setAlbum) }, [repository])
  const currentPage = album?.pages[pageNumber - 1] ?? null
  const savePage = useCallback((page: ScrapbookPage) => { setAlbum((current) => current ? { ...current, pages: current.pages.map((item) => item.id === page.id ? page : item) } : current); void repository.savePage(page) }, [repository])
  const open = useCallback(() => { setBookState('PAGE'); setPageNumber(1) }, [])
  const goTo = useCallback((target: number) => { if (!album) return; setBookState('PAGE'); setPageNumber(Math.min(Math.max(target, 1), album.pageCount)) }, [album])
  const next = useCallback(() => { if (!album) return; if (bookState === 'CLOSED') return open(); if (bookState === 'PAGE' && pageNumber < album.pageCount) return setPageNumber((current) => current + 1); if (bookState === 'PAGE') setBookState('BACK_COVER') }, [album, bookState, open, pageNumber])
  const previous = useCallback(() => { if (bookState === 'BACK_COVER') return setBookState('PAGE'); if (bookState === 'PAGE' && pageNumber > 1) return setPageNumber((current) => current - 1); if (bookState === 'PAGE') setBookState('CLOSED') }, [bookState, pageNumber])
  useEffect(() => {
    if (!isPresenting || isPaused) return
    const timer = window.setInterval(() => { if (bookState === 'BACK_COVER') { setIsPresenting(false); return } next() }, 6500)
    return () => window.clearInterval(timer)
  }, [bookState, isPaused, isPresenting, next])
  const setPaper = useCallback((paperType: PaperType) => { if (currentPage) savePage({ ...currentPage, paperType, updatedAt: new Date().toISOString() }) }, [currentPage, savePage])
  const addElement = useCallback((type: AlbumElementType, author?: AuthorIdentity) => { if (!currentPage) return; savePage({ ...currentPage, elements: [...currentPage.elements, createElement(currentPage.id, type, currentPage.elements.length + 1, author)], updatedAt: new Date().toISOString() }) }, [currentPage, savePage])
  const updateElement = useCallback((elementId: string, patch: Partial<Omit<AlbumElement, 'id' | 'pageId'>>) => {
    if (!currentPage) return
    const elements = currentPage.elements.map((element) => element.id !== elementId ? element : { ...element, ...patch, layout: patch.layout ? clampLayout(patch.layout as ElementLayout) : element.layout, updatedAt: new Date().toISOString() })
    savePage({ ...currentPage, elements, updatedAt: new Date().toISOString() })
  }, [currentPage, savePage])
  const deleteElement = useCallback((elementId: string) => { if (currentPage) savePage({ ...currentPage, elements: currentPage.elements.filter((element) => element.id !== elementId), updatedAt: new Date().toISOString() }) }, [currentPage, savePage])
  return { album, currentPage, bookState, pageNumber, isPresenting, isPaused, open, next, previous, goTo, setPaper, addElement, updateElement, deleteElement, startPresentation: () => { if (bookState !== 'PAGE') open(); setIsPresenting(true); setIsPaused(false) }, pausePresentation: () => setIsPaused(true), resumePresentation: () => setIsPaused(false), stopPresentation: () => { setIsPresenting(false); setIsPaused(false) } }
}
