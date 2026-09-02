import { useCallback, useEffect, useMemo, useState } from 'react'
import { createElement, clampLayout, isElementOwner, pageCapacity, spreadStart, type AlbumElement, type AlbumElementType, type AlbumDocument, type AuthorIdentity, type BookState, type ElementLayout, type PaperType, type ScrapbookPage } from '../domain/types'
import { LocalAlbumRepository } from '../repositories/LocalAlbumRepository'
import { FirestoreAlbumRepository } from '../repositories/FirestoreAlbumRepository'
import type { AlbumRepository } from '../repositories/AlbumRepository'
import { isFirebaseConfigured } from '../../../infrastructure/firebase/client'

export function useAlbum(localOnly = false, spreadMode = false) {
  const repository = useMemo<AlbumRepository>(() => !localOnly && isFirebaseConfigured ? new FirestoreAlbumRepository() : new LocalAlbumRepository(), [localOnly])
  const [album, setAlbum] = useState<AlbumDocument | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [bookState, setBookState] = useState<BookState>('CLOSED')
  const [pageNumber, setPageNumber] = useState(1)
  const [isPresenting, setIsPresenting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (repository.subscribe) return repository.subscribe(setAlbum, () => setSyncError('No fue posible sincronizar la libreta con Firebase.'))
    const refresh = () => { void repository.getAlbum().then(setAlbum) }
    refresh()
    window.addEventListener('brattypolitan-album-change', refresh)
    return () => window.removeEventListener('brattypolitan-album-change', refresh)
  }, [repository])

  const currentPage = album?.pages[pageNumber - 1] ?? null
  const persistPages = useCallback(async (pages: ScrapbookPage[]) => {
    setAlbum((current) => current ? { ...current, pages: current.pages.map((item) => pages.find((page) => page.id === item.id) ?? item) } : current)
    try { for (const page of pages) await repository.savePage(page); return true }
    catch { setSyncError('No se pudo guardar el cambio en la libreta.'); return false }
  }, [repository])
  const savePage = useCallback((page: ScrapbookPage) => { void persistPages([page]) }, [persistPages])
  const open = useCallback(() => { setBookState('PAGE'); setPageNumber(1) }, [])
  const goTo = useCallback((target: number) => {
    if (!album) return
    setBookState('PAGE')
    setPageNumber(spreadMode ? spreadStart(target, album.pageCount) : Math.min(Math.max(Math.round(target || 1), 1), album.pageCount))
  }, [album, spreadMode])
  const next = useCallback(() => {
    if (!album) return
    if (bookState === 'CLOSED') return open()
    const step = spreadMode ? 2 : 1
    if (bookState === 'PAGE' && pageNumber + step <= album.pageCount) return setPageNumber((current) => current + step)
    if (bookState === 'PAGE') setBookState('BACK_COVER')
  }, [album, bookState, open, pageNumber, spreadMode])
  const previous = useCallback(() => {
    const step = spreadMode ? 2 : 1
    if (bookState === 'BACK_COVER') return setBookState('PAGE')
    if (bookState === 'PAGE' && pageNumber > 1) return setPageNumber((current) => Math.max(1, current - step))
    if (bookState === 'PAGE') setBookState('CLOSED')
  }, [bookState, pageNumber, spreadMode])
  useEffect(() => {
    if (!isPresenting || isPaused) return
    const timer = window.setInterval(() => { if (bookState === 'BACK_COVER') { setIsPresenting(false); return } next() }, 6500)
    return () => window.clearInterval(timer)
  }, [bookState, isPaused, isPresenting, next])
  const setPaper = useCallback((paperType: PaperType) => { if (currentPage) savePage({ ...currentPage, paperType, updatedAt: new Date().toISOString() }) }, [currentPage, savePage])
  const addElement = useCallback((type: AlbumElementType, author?: AuthorIdentity) => {
    if (!currentPage || pageCapacity(currentPage).isFull) { setSyncError('Esta cara ya contiene cuatro elementos. Elige otra hoja.'); return }
    savePage({ ...currentPage, elements: [...currentPage.elements, createElement(currentPage.id, type, currentPage.elements.length + 1, author)], updatedAt: new Date().toISOString() })
  }, [currentPage, savePage])
  const updateElementOnPage = useCallback((pageId: string, elementId: string, patch: Partial<Omit<AlbumElement, 'id' | 'pageId'>>, actorId?: string) => {
    const page = album?.pages.find((item) => item.id === pageId)
    const existing = page?.elements.find((element) => element.id === elementId)
    if (!page || !existing || (actorId && !isElementOwner(existing, actorId))) return false
    const elements = page.elements.map((element) => element.id !== elementId ? element : { ...element, ...patch, layout: patch.layout ? clampLayout(patch.layout as ElementLayout) : element.layout, updatedAt: new Date().toISOString() })
    savePage({ ...page, elements, updatedAt: new Date().toISOString() })
    return true
  }, [album, savePage])
  const updateElement = useCallback((elementId: string, patch: Partial<Omit<AlbumElement, 'id' | 'pageId'>>) => currentPage ? updateElementOnPage(currentPage.id, elementId, patch) : false, [currentPage, updateElementOnPage])
  const deleteElement = useCallback((elementId: string) => { if (currentPage) savePage({ ...currentPage, elements: currentPage.elements.filter((element) => element.id !== elementId), updatedAt: new Date().toISOString() }) }, [currentPage, savePage])
  const deleteOwnedElement = useCallback(async (pageId: string, elementId: string, actorId: string) => {
    const page = album?.pages.find((item) => item.id === pageId)
    const element = page?.elements.find((item) => item.id === elementId)
    if (!page || !element || !isElementOwner(element, actorId)) return false
    return persistPages([{ ...page, elements: page.elements.filter((item) => item.id !== elementId), updatedAt: new Date().toISOString() }])
  }, [album, persistPages])
  const moveOwnedElement = useCallback(async (sourcePageId: string, elementId: string, targetPageId: string, actorId: string) => {
    const source = album?.pages.find((page) => page.id === sourcePageId)
    const target = album?.pages.find((page) => page.id === targetPageId)
    const element = source?.elements.find((item) => item.id === elementId)
    if (!source || !target || !element || !isElementOwner(element, actorId)) return false
    if (source.id === target.id) return true
    if (pageCapacity(target).isFull) { setSyncError('Esa cara ya está llena.'); return false }
    const now = new Date().toISOString()
    return persistPages([
      { ...source, elements: source.elements.filter((item) => item.id !== elementId), updatedAt: now },
      { ...target, elements: [...target.elements, { ...element, pageId: target.id, updatedAt: now }], updatedAt: now },
    ])
  }, [album, persistPages])
  const toggleLike = useCallback((pageId: string, elementId: string, actorId: string) => {
    const page = album?.pages.find((item) => item.id === pageId)
    const element = page?.elements.find((item) => item.id === elementId)
    if (!page || !element) return false
    const likedBy = element.likedBy ?? []
    return updateElementOnPage(pageId, elementId, { likedBy: likedBy.includes(actorId) ? likedBy.filter((id) => id !== actorId) : [...likedBy, actorId] })
  }, [album, updateElementOnPage])

  return { album, currentPage, bookState, pageNumber, isPresenting, isPaused, syncError, usesFirebase: !localOnly && isFirebaseConfigured, open, next, previous, goTo, setPaper, addElement, updateElement, updateElementOnPage, deleteElement, deleteOwnedElement, moveOwnedElement, toggleLike, startPresentation: () => { if (bookState !== 'PAGE') open(); setIsPresenting(true); setIsPaused(false) }, pausePresentation: () => setIsPaused(true), resumePresentation: () => setIsPaused(false), stopPresentation: () => { setIsPresenting(false); setIsPaused(false) } }
}
