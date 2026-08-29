import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlbumPaper } from '../components/AlbumPaper'
import type { AlbumElement, AlbumElementType, AuthorIdentity, ElementLayout } from '../domain/types'
import { clampLayout, createElement } from '../domain/types'
import { useAlbum } from '../hooks/useAlbum'
import { useAdminSession } from '../../access/useAdminSession'
import { readLocalParticipationSettings, writeLocalParticipationSettings } from '../data/localParticipation'
import { readPendingSubmissions, writePendingSubmissions, type PendingSubmission } from '../data/localModeration'
import { LocalAlbumRepository } from '../repositories/LocalAlbumRepository'
import { usePublicAlbumAccess } from '../hooks/usePublicAlbumAccess'
import { experienceLaunch } from '../../landing/data/experienceLaunch'

type Gesture = { id: string; mode: 'move' | 'resize' | 'rotate'; startX: number; startY: number; layout: ElementLayout }
const ELEMENTS: { type: AlbumElementType; label: string }[] = [{ type: 'PHOTO', label: 'Foto' }, { type: 'POST_IT', label: 'Post-it' }, { type: 'TEXT', label: 'Texto libre' }, { type: 'HANDWRITTEN_NOTE', label: 'Nota manuscrita' }, { type: 'STICKER', label: 'Sticker' }, { type: 'PLACEHOLDER', label: 'Placeholder' }, { type: 'DRAWING', label: 'Dibujo' }]

function AlbumPublicAccessControl() {
  const access = usePublicAlbumAccess()
  const [now, setNow] = useState(() => Date.now())
  const target = new Date(experienceLaunch.targetDate).getTime()
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])
  const remaining = Math.max(target - now, 0)
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  return <span className="album-public-access-control"><button type="button" onClick={() => void access.setUnlocked(!access.manualUnlocked)}>{access.isUnlocked ? 'Cerrar libreta pública' : 'Abrir libreta pública'}</button>{!access.isUnlocked && <small>APERTURA AUTOMÁTICA · {String(days).padStart(2, '0')}D {String(hours).padStart(2, '0')}H {String(minutes).padStart(2, '0')}M</small>}{access.error && <small>{access.error}</small>}</span>
}

function AlbumEditorWorkspace() {
  const album = useAlbum(true)
  const session = useAdminSession()
  useEffect(() => {
    const header = document.querySelector('.album-editor-header')
    if (!header) return
    const link = document.createElement('a')
    link.className = 'album-editor-landing-link'; link.href = '/'; link.textContent = 'Volver al landing'
    header.append(link)
    return () => link.remove()
  }, [])
  const [participationOpen, setParticipationOpen] = useState(() => readLocalParticipationSettings().isOpen)
  const [pending, setPending] = useState<PendingSubmission[]>(() => readPendingSubmissions())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [author, setAuthor] = useState<AuthorIdentity>({ participantId: 'developer-local' })
  const stageRef = useRef<HTMLDivElement | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const selected = album.currentPage?.elements.find((element) => element.id === selectedId) ?? null
  const updateSelected = (patch: Partial<AlbumElement>) => { if (selected) album.updateElement(selected.id, patch) }
  const rejectSubmission = (id: string) => { const next = pending.filter((item) => item.id !== id); setPending(next); writePendingSubmissions(next) }
  const approveSubmission = async (submission: PendingSubmission) => { if (!album.album) return; const repository = new LocalAlbumRepository(); for (const number of submission.pageNumbers) { const page = album.album.pages[number - 1]; const element = createElement(page.id, submission.type, page.elements.length + 1, submission.author); element.content = submission.content || element.content; element.media = submission.media; page.elements.push(element); await repository.savePage({ ...page, updatedAt: new Date().toISOString() }) }; rejectSubmission(submission.id); window.location.reload() }
  const pointerDown = (event: ReactPointerEvent<HTMLElement>, element: AlbumElement, mode: 'move' | 'resize' | 'rotate') => { if (element.layout.locked) return; event.preventDefault(); gesture.current = { id: element.id, mode, startX: event.clientX, startY: event.clientY, layout: element.layout }; event.currentTarget.setPointerCapture(event.pointerId) }
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!active || !bounds) return
    const deltaX = (event.clientX - active.startX) / bounds.width
    const deltaY = (event.clientY - active.startY) / bounds.height
    const layout = active.mode === 'move' ? clampLayout({ ...active.layout, x: active.layout.x + deltaX, y: active.layout.y + deltaY }) : active.mode === 'rotate' ? { ...active.layout, rotation: Math.round((active.layout.rotation + deltaX * 180) * 2) / 2 } : clampLayout({ ...active.layout, width: active.layout.width + deltaX, height: active.layout.height + deltaY })
    album.updateElement(active.id, { layout })
  }
  const page = album.currentPage
  return <main className="album-editor-page"><header className="album-editor-header"><div><p>HERRAMIENTA INTERNA · DESARROLLO</p><h1>Scrapbook Editor</h1></div><Link to="/album">Estado público</Link></header><section className="album-editor-panel"><p className="album-editor-help">{session.user ? `Sesión admin: ${session.user.email ?? session.user.uid}` : 'Inicia sesión con Google para activar la interfaz de participantes.'}</p>{session.user ? <><button type="button" onClick={() => void session.signOut()}>Cerrar sesión</button><button type="button" onClick={() => { const next = !participationOpen; setParticipationOpen(next); writeLocalParticipationSettings({ isOpen: next }) }}>{participationOpen ? 'Cerrar captura de participantes' : 'Abrir captura de participantes'}</button><AlbumPublicAccessControl /></> : <button type="button" onClick={() => void session.signIn()}>Iniciar sesión con Google</button>}<p className="album-editor-help">Modo local: {participationOpen ? 'captura abierta' : 'captura cerrada'} · <Link to="/contribute">Ver interfaz</Link></p></section>{!page ? <p>Cargando libreta…</p> : <div className="album-editor-layout"><aside className="album-editor-panel"><section><h2>Hoja {page.pageNumber} / 100</h2><div className="editor-page-nav"><button type="button" onClick={album.previous}>←</button><input aria-label="Número de página" type="number" min="1" max="100" value={page.pageNumber} onChange={(event) => album.goTo(Number(event.target.value) || 1)} /><button type="button" onClick={album.next}>→</button></div><label>Papel<select value={page.paperType} onChange={(event) => album.setPaper(event.target.value as 'GRID' | 'LINED')}><option value="GRID">Cuadro</option><option value="LINED">Rayas</option></select></label></section><section><h2>Autor de nuevos elementos</h2><p className="album-editor-help">Este ID llegará del acceso QR y vinculará cada recuerdo a su autor en Firebase.</p><label>ID de participante<input value={author.participantId} onChange={(event) => setAuthor((current) => ({ ...current, participantId: event.target.value || 'developer-local' }))} /></label><label>Nombre <input value={author.displayName ?? ''} onChange={(event) => setAuthor((current) => ({ ...current, displayName: event.target.value || undefined }))} /></label><label>Edad <input type="number" min="0" max="120" value={author.age ?? ''} onChange={(event) => setAuthor((current) => ({ ...current, age: event.target.value ? Number(event.target.value) : undefined }))} /></label></section><section><h2>Añadir elemento</h2><div className="element-add-grid">{ELEMENTS.map((item) => <button type="button" key={item.type} onClick={() => album.addElement(item.type, author)}>+ {item.label}</button>)}</div></section><section><h2>Elemento seleccionado</h2>{selected ? <><code>{selected.type} · {selected.id.slice(-8)}</code><p className="album-editor-author">Autor: {selected.author.displayName ?? selected.author.participantId}{selected.author.age ? ` · ${selected.author.age}` : ''}</p><label>Contenido<textarea value={selected.content ?? ''} onChange={(event) => updateSelected({ content: event.target.value })} /></label><div className="album-layout-fields">{(['x', 'y', 'width', 'height', 'rotation', 'zIndex'] as const).map((field) => <label key={field}>{field}<input type="number" step={field === 'rotation' || field === 'zIndex' ? '1' : '.01'} value={selected.layout[field]} onChange={(event) => updateSelected({ layout: { ...selected.layout, [field]: Number(event.target.value) } })} /></label>)}</div><label><input type="checkbox" checked={selected.layout.locked} onChange={(event) => updateSelected({ layout: { ...selected.layout, locked: event.target.checked } })} /> Bloquear</label><button type="button" className="album-delete-button" onClick={() => { album.deleteElement(selected.id); setSelectedId(null) }}>Eliminar elemento</button></> : <p className="album-editor-help">Añade o selecciona un elemento para modificarlo.</p>}</section></aside><section className="album-editor-workspace"><div className="album-editor-status"><span>{page.paperType === 'GRID' ? 'Papel cuadriculado' : 'Papel rayado'}</span><span>{page.elements.length} elementos</span><span>Modo local de pruebas</span></div><div className="album-editor-stage" ref={stageRef} onPointerMove={pointerMove} onPointerUp={() => { gesture.current = null }} onPointerCancel={() => { gesture.current = null }}><AlbumPaper page={page} editable selectedId={selectedId} onSelect={setSelectedId} onElementPointerDown={pointerDown} onBackgroundPointerDown={() => setSelectedId(null)} /></div><p className="album-editor-help">Arrastra el elemento para moverlo. Usa el cuadro inferior derecho para cambiar tamaño y el control superior derecho para rotar.</p></section></div>}</main>
}

export function AlbumEditorPage() {
  const [pending, setPending] = useState<PendingSubmission[]>(() => readPendingSubmissions())
  const [review, setReview] = useState<PendingSubmission | null>(null)
  const approve = async (submission: PendingSubmission) => {
    const repository = new LocalAlbumRepository(); const album = await repository.getAlbum()
    for (const pageNumber of submission.pageNumbers) { const page = album.pages[pageNumber - 1]; const element = createElement(page.id, submission.type, page.elements.length + 1, submission.author); element.content = submission.content || element.content; element.media = submission.media; page.elements.push(element); await repository.savePage({ ...page, updatedAt: new Date().toISOString() }) }
    const next = pending.filter((item) => item.id !== submission.id); setPending(next); writePendingSubmissions(next)
  }
  const reject = (id: string) => { const next = pending.filter((item) => item.id !== id); setPending(next); writePendingSubmissions(next) }
  return <>{review && <div className="moderation-preview" role="dialog" aria-modal="true"><div><button type="button" onClick={() => setReview(null)}>Cerrar</button><p>VISTA PREVIA · PENDIENTE</p><h2>{review.type}</h2><p>Autor: {review.author.displayName ?? 'Anónimo'} · páginas {review.pageNumbers.join(', ')}</p>{review.type === 'PHOTO' && review.content?.startsWith('data:image/') ? <img src={review.content} alt="Vista previa" /> : <p>{review.content || 'Sin texto'}</p>}<button type="button" onClick={() => { void approve(review); setReview(null) }}>Aprobar y publicar</button></div></div>}<section className="moderation-panel"><p>HERRAMIENTA INTERNA · SEGURIDAD</p><h2>Publicaciones pendientes · {pending.length}</h2>{pending.length ? pending.map((item) => <article key={item.id}><b>{item.type}</b><small>{item.author.displayName ?? 'Anónimo'} · páginas {item.pageNumbers.join(', ')}</small>{item.type === 'PHOTO' && item.content?.startsWith('data:image/') ? <img src={item.content} alt="Pendiente de revisión" /> : <p>{item.content || 'Sin texto'}</p>}<button type="button" onClick={() => setReview(item)}>Revisar elemento</button><button type="button" onClick={() => void approve(item)}>Aprobar y publicar</button><button type="button" onClick={() => reject(item.id)}>Rechazar</button></article>) : <p>No hay recuerdos pendientes.</p>}</section><AlbumEditorWorkspace /></>
}
