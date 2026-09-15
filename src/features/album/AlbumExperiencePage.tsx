import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { ExperienceWord } from '../../components/BrattypolitanWordmark'
import { useGoogleSession } from '../access/useGoogleSession'
import { AlbumControls, type ReaderPaperTheme, type ReaderViewMode } from './components/AlbumControls'
import { PageIndex } from './components/PageIndex'
import { Scrapbook } from './components/Scrapbook'
import { getLocalParticipantId } from './domain/participantIdentity'
import { clampLayout, isElementOwner, resizeLayoutProportionally, scaleLayoutProportionally, type AlbumElement, type ElementLayout } from './domain/types'
import { useAlbum } from './hooks/useAlbum'
import { useElementReactions } from '../reactions/hooks/useElementReactions'
import { AlbumElementPreview } from './components/AlbumElementPreview'

type Selection = { pageId: string; elementId: string }
type Gesture = { pageId: string; elementId: string; mode: 'move' | 'resize' | 'rotate'; startX: number; startY: number; width: number; height: number; layout: ElementLayout; latest: ElementLayout; node: HTMLElement }

export function AlbumExperiencePage() {
  const [viewMode, setViewMode] = useState<ReaderViewMode>(() => localStorage.getItem('brattypolitan.album-view') === 'SINGLE' ? 'SINGLE' : 'BOOK')
  const [paperTheme, setPaperTheme] = useState<ReaderPaperTheme>(() => localStorage.getItem('brattypolitan.album-paper-theme') === 'BLACK' ? 'BLACK' : 'CREAM')
  const album = useAlbum(false, viewMode === 'BOOK')
  const albumDocument = album.album
  const goToAlbum = album.goTo
  const updateElementOnPage = album.updateElementOnPage
  const session = useGoogleSession()
  const viewerId = session.user?.uid ?? getLocalParticipantId()
  const canInspectAll = session.isAdmin || session.role === 'SPECIAL'
  const elementReactions = useElementReactions()
  const [indexOpen, setIndexOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [editingElement, setEditingElement] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [interactionHint, setInteractionHint] = useState(true)
  const [direction, setDirection] = useState<'next' | 'previous'>('next')
  const [bookmarkPage, setBookmarkPage] = useState(() => Number(localStorage.getItem('brattypolitan.album-bookmark-page')) || 1)
  const gesture = useRef<Gesture | null>(null)

  useEffect(() => {
    const target = Number(new URLSearchParams(window.location.search).get('page'))
    if (target > 0) goToAlbum(target)
  }, [albumDocument, goToAlbum])
  useEffect(() => { localStorage.setItem('brattypolitan.album-view', viewMode) }, [viewMode])
  useEffect(() => { localStorage.setItem('brattypolitan.album-paper-theme', paperTheme) }, [paperTheme])
  useEffect(() => {
    const timer = window.setTimeout(() => setInteractionHint(false), 4_600)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!previewOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreviewOpen(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape) }
  }, [previewOpen])
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const active = gesture.current
      if (!active) return
      event.preventDefault()
      const deltaX = (event.clientX - active.startX) / active.width
      const deltaY = (event.clientY - active.startY) / active.height
      const layout = active.mode === 'move'
        ? clampLayout({ ...active.layout, x: active.layout.x + deltaX, y: active.layout.y + deltaY })
        : active.mode === 'rotate'
          ? { ...active.layout, rotation: Math.round(active.layout.rotation + deltaX * 180) }
          : active.node.classList.contains('type-setlist')
            ? resizeLayoutProportionally(active.layout, deltaX, deltaY, .2, .1)
            : clampLayout({ ...active.layout, width: active.layout.width + deltaX, height: active.layout.height + deltaY })
      active.latest = layout
      active.node.style.left = `${layout.x * 100}%`
      active.node.style.top = `${layout.y * 100}%`
      active.node.style.width = `${layout.width * 100}%`
      active.node.style.height = `${layout.height * 100}%`
      active.node.style.transform = `rotate(${layout.rotation}deg)`
    }
    const end = () => {
      const active = gesture.current
      if (active) updateElementOnPage(active.pageId, active.elementId, { layout: active.latest }, viewerId, session.isAdmin)
      gesture.current = null
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end) }
  }, [session.isAdmin, updateElementOnPage, viewerId])

  const selected = useMemo(() => {
    if (!selection) return null
    const page = album.album?.pages.find((item) => item.id === selection.pageId)
    const element = page?.elements.find((item) => item.id === selection.elementId)
    return page && element ? { page, element } : null
  }, [album.album, selection])
  const selectedOwned = Boolean(selected && isElementOwner(selected.element, viewerId))
  const selectedCanAdjust = Boolean(selected && (selectedOwned || session.isAdmin))
  const selectedWrittenContent = selected && ['POST_IT', 'TEXT', 'HANDWRITTEN_NOTE'].includes(selected.element.type) ? selected.element.content?.trim() : ''
  const next = () => { if (editingElement) return; setSelection(null); setDirection('next'); album.next() }
  const previous = () => { if (editingElement) return; setSelection(null); setDirection('previous'); album.previous() }
  const goTo = (page: number) => { if (editingElement) return; setSelection(null); setDirection(page >= album.pageNumber ? 'next' : 'previous'); album.goTo(page) }
  const setBookmark = (page: number) => { setBookmarkPage(page); localStorage.setItem('brattypolitan.album-bookmark-page', String(page)) }
  const leftPage = album.pageNumber === 1 ? null : album.album?.pages[album.pageNumber - 1] ?? null
  const rightPage = album.pageNumber === 1 ? album.album?.pages[0] ?? null : album.album?.pages[album.pageNumber] ?? null
  const patchSelectedLayout = (patch: Partial<ElementLayout>) => {
    if (!selected) return
    album.updateElementOnPage(selected.page.id, selected.element.id, { layout: clampLayout({ ...selected.element.layout, ...patch }) }, viewerId, session.isAdmin)
  }
  const scaleSelected = (scale: number) => {
    if (!selected) return
    const layout = selected.element.type === 'SETLIST'
      ? scaleLayoutProportionally(selected.element.layout, scale, .2, .1)
      : scaleLayoutProportionally(selected.element.layout, scale)
    album.updateElementOnPage(selected.page.id, selected.element.id, { layout }, viewerId, session.isAdmin)
  }
  const beginGesture = (event: ReactPointerEvent<HTMLDivElement>, pageId: string, element: AlbumElement, mode: Gesture['mode']) => {
    if (element.layout.locked) return
    const paper = event.currentTarget.closest('.album-paper')?.getBoundingClientRect()
    const node = event.currentTarget.closest('.album-element') as HTMLElement | null
    if (!paper || !node) return
    event.preventDefault()
    gesture.current = { pageId, elementId: element.id, mode, startX: event.clientX, startY: event.clientY, width: paper.width, height: paper.height, layout: element.layout, latest: element.layout, node }
    setSelection({ pageId, elementId: element.id })
  }

  return <main className="album-experience">
    <header className="album-header"><Link to="/">BRATTYPOLITAN <ExperienceWord /></Link><p>LIBRETA DIGITAL · VOLUMEN 01</p></header>
    <section className={`album-reader${editingElement ? ' is-editing' : ''}`}>
      {interactionHint && <p className="album-interaction-hint" role="status">Pulsa una aportación para ver más información.</p>}
      <Scrapbook state={album.bookState} page={album.currentPage} leftPage={leftPage} rightPage={rightPage} bookmarkPage={bookmarkPage} viewerId={viewerId} selectedId={selection?.elementId} editable={editingElement} canEditAll={session.isAdmin} revealAll={canInspectAll} canInspectAll={canInspectAll} reactionsByElement={elementReactions.reactions} navigationLocked={editingElement} viewMode={viewMode} paperTheme={paperTheme} onBookmark={() => goTo(bookmarkPage)} direction={direction} onPrevious={previous} onNext={next} onSelect={(pageId, elementId) => { if (selection?.elementId !== elementId) setEditingElement(false); setPreviewOpen(false); setSelection({ pageId, elementId }) }} onLike={session.user ? (_pageId, element) => void elementReactions.toggle(element.id, session.user!.uid) : undefined} onElementPointerDown={beginGesture} />
      {selected && <aside className="album-owner-tools album-contribution-details" aria-label="Datos de la aportación">
        <div className="album-contribution-information"><b>{selectedOwned ? 'Tu publicación' : 'Aportación'} · cara {selected.page.pageNumber}</b><small>{editingElement ? 'Edición activa: la página está bloqueada y sólo se moverá este elemento.' : 'Datos de la persona que compartió este recuerdo.'}</small><dl><div><dt>Nombre</dt><dd>{selected.element.author.displayName || 'Anónimo'}</dd></div><div><dt>Edad</dt><dd>{selected.element.author.age ?? 'No indicada'}</dd></div><div><dt>Identificador</dt><dd>{selected.element.author.participantId}</dd></div><div><dt>Publicación</dt><dd>{new Date(selected.element.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div><div><dt>Visibilidad</dt><dd>{selected.element.visibility === 'PRIVATE' ? 'Privada' : 'Pública'}</dd></div>{selectedWrittenContent && <div className="is-wide"><dt>Contenido completo</dt><dd>{selectedWrittenContent}</dd></div>}</dl></div>
        <button type="button" className="album-contribution-preview" onClick={() => setPreviewOpen(true)} aria-label="Ampliar aportación en pantalla completa"><AlbumElementPreview element={selected.element} /><span>Ver en pantalla completa</span></button>
        <div className="album-contribution-actions">
        {selectedCanAdjust && (!editingElement ? <button type="button" className="album-edit-trigger" onClick={() => setEditingElement(true)}>Editar elemento</button> : <>
        <button type="button" onClick={() => patchSelectedLayout({ x: selected.element.layout.x - .03 })} aria-label="Mover a la izquierda">←</button>
        <button type="button" onClick={() => patchSelectedLayout({ y: selected.element.layout.y - .03 })} aria-label="Mover arriba">↑</button>
        <button type="button" onClick={() => patchSelectedLayout({ y: selected.element.layout.y + .03 })} aria-label="Mover abajo">↓</button>
        <button type="button" onClick={() => patchSelectedLayout({ x: selected.element.layout.x + .03 })} aria-label="Mover a la derecha">→</button>
        <button type="button" onClick={() => scaleSelected(.88)}>− Tamaño</button>
        <button type="button" onClick={() => scaleSelected(1.12)}>+ Tamaño</button>
        <button type="button" onClick={() => patchSelectedLayout({ rotation: selected.element.layout.rotation - 5 })}>↶ Rotar</button>
        <button type="button" onClick={() => patchSelectedLayout({ rotation: selected.element.layout.rotation + 5 })}>↷ Rotar</button>
        <button type="button" onClick={() => patchSelectedLayout({ zIndex: Math.max(...selected.page.elements.map((item) => item.layout.zIndex), 0) + 1 })}>Traer al frente</button>
        {selectedOwned && <button type="button" onClick={() => setMoveOpen(true)}>Cambiar de cara</button>}
        <button type="button" onClick={() => { gesture.current = null; setEditingElement(false) }}>Terminar edición</button>
        {selectedOwned && <button type="button" className="is-danger" onClick={() => { if (window.confirm('¿Eliminar definitivamente tu publicación?')) void album.deleteOwnedElement(selected.page.id, selected.element.id, viewerId).then(() => { setEditingElement(false); setSelection(null) }) }}>Eliminar</button>}</>)}
        {!editingElement && <button type="button" onClick={() => setSelection(null)}>Cerrar</button>}
        </div>
      </aside>}
      <AlbumControls state={album.bookState} pageNumber={album.pageNumber} pageCount={album.album?.pageCount ?? 100} bookmarkPage={bookmarkPage} onBookmarkPage={setBookmark} presenting={album.isPresenting} paused={album.isPaused} locked={editingElement} viewMode={viewMode} paperTheme={paperTheme} onViewMode={(mode) => { setSelection(null); setViewMode(mode) }} onPaperTheme={setPaperTheme} onPrevious={previous} onNext={next} onIndex={() => setIndexOpen(true)} onPresent={album.startPresentation} onPause={album.pausePresentation} onResume={album.resumePresentation} />
      {album.syncError && <p className="album-sync-error">{album.syncError}</p>}
      {elementReactions.error && <p className="album-sync-error">{elementReactions.error}</p>}
    </section>
    <PageIndex open={indexOpen} pages={album.album?.pages} pageCount={album.album?.pageCount ?? 100} current={album.pageNumber} ownerId={viewerId} onClose={() => setIndexOpen(false)} onGoTo={goTo} />
    <PageIndex open={moveOpen} pages={album.album?.pages} pageCount={album.album?.pageCount ?? 100} current={selected?.page.pageNumber ?? album.pageNumber} ownerId={viewerId} mode="select" allowCurrentFull title="Mover tu publicación" onClose={() => setMoveOpen(false)} onGoTo={(pageNumber) => { if (!selected || !album.album) return; const target = album.album.pages[pageNumber - 1]; void album.moveOwnedElement(selected.page.id, selected.element.id, target.id, viewerId).then((moved) => { if (moved) { setDirection(pageNumber >= album.pageNumber ? 'next' : 'previous'); album.goTo(pageNumber); setSelection({ pageId: target.id, elementId: selected.element.id }) } }) }} />
    {selected && previewOpen && <div className="album-contribution-lightbox" role="dialog" aria-modal="true" aria-label="Aportación en pantalla completa" onClick={() => setPreviewOpen(false)}><button type="button" autoFocus aria-label="Cerrar pantalla completa" onClick={() => setPreviewOpen(false)}>×</button><div onClick={(event) => event.stopPropagation()}><AlbumElementPreview element={selected.element} expanded /></div></div>}
    <p className="album-reader-note">Cada cara es independiente · máximo cuatro elementos por cara.</p>
  </main>
}
