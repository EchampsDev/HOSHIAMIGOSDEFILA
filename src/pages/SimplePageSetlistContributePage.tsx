import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import '../styles/setlist-preview.css'
import { Layout } from '../components/Layout'
import { ExperienceWord } from '../components/BrattypolitanWordmark'
import { useGoogleSession } from '../features/access/useGoogleSession'
import { useParticipationAccess } from '../features/album/hooks/useParticipationAccess'
import { getSetlistAlbum, readSetlistTracks, setlistAlbumLabels, setlistAlbumOrder, type SetlistTrack } from '../features/album/data/localSetlistCatalog'
import { resolveSetlistCoverUrl, setlistCatalogRepository } from '../features/album/repositories/SetlistCatalogRepository'
import { LocalAlbumRepository } from '../features/album/repositories/LocalAlbumRepository'
import { clampLayout, createElement, type AlbumElement, type AlbumElementType, type AuthorIdentity, type ElementLayout, type SetlistEntry } from '../features/album/domain/types'

const TOP_SIZE = 3
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const postItColors = [
  ['yellow', 'Amarillo'], ['green', 'Verde'], ['blue', 'Azul'], ['purple', 'Morado'], ['pink', 'Rosa'], ['red', 'Rojo'], ['brown', 'Café'], ['violet', 'Violeta'], ['white', 'Blanco'], ['black', 'Negro'], ['gray', 'Gris'], ['dark-green', 'Verde oscuro'], ['royal-blue', 'Azul rey'], ['cyan', 'Azul cian'], ['pride', 'Orgullo LGBT+'],
] as const

type ContributionType = AlbumElementType | 'SETLIST'
type TopSelectionType = 'HOSHI' | 'BRATTY'
type PhotoDraft = { data: string; size: number; mime: string }

const topTitles: Record<TopSelectionType, string> = {
  HOSHI: 'MI TOP 3 DE HOSHI',
  BRATTY: 'MI TOP 3 DE TODA LA MÚSICA DE BRATTY',
}
const idForParticipant = () => `participant-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
const withinPageRange = (value: number) => Math.min(Math.max(Math.round(value || 1), 1), 100)

function imageLoader(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = source
  })
}

function drawSquareCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, size: number) {
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
  context.drawImage(image, (image.naturalWidth - sourceSize) / 2, (image.naturalHeight - sourceSize) / 2, sourceSize, sourceSize, x, y, size, size)
}

async function makePreview(tracks: SetlistTrack[], authorName: string, page: number, title: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No fue posible crear la imagen.')
  context.fillStyle = '#060606'
  context.fillRect(0, 0, 1080, 1350)
  context.fillStyle = '#ffffff'
  context.font = '700 25px monospace'
  context.fillText('BRATTYPOLITAN', 70, 80)
  const brandWidth = context.measureText('BRATTYPOLITAN').width
  context.fillStyle = '#d9b65d'
  context.font = 'italic 700 34px Georgia'
  context.fillText('Experience', 82 + brandWidth, 80)
  context.fillStyle = '#fff'
  context.font = title.length > 24 ? '700 43px sans-serif' : '700 66px sans-serif'
  context.fillText(title, 70, 158, 940)
  context.fillStyle = '#7aaeff'
  context.font = '24px monospace'
  context.fillText(`${authorName || 'PARTICIPANTE ANÓNIMO'} · PÁGINA ${page}`, 70, 205)
  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index]
    const x = 70 + index * 320
    const y = 280
    context.fillStyle = '#15213e'
    context.fillRect(x, y, 286, 300)
    if (track.coverUrl) {
      try { drawSquareCover(context, await imageLoader(resolveSetlistCoverUrl(track.coverUrl) ?? ''), x + 18, y + 18, 250) }
      catch { context.fillStyle = '#f5dc50'; context.fillRect(x + 18, y + 18, 250, 250) }
    } else { context.fillStyle = '#f5dc50'; context.fillRect(x + 18, y + 18, 250, 250) }
    context.fillStyle = '#f5dc50'
    context.font = '19px monospace'
    context.fillText(String(index + 1).padStart(2, '0'), x + 18, y + 292)
    context.fillStyle = '#fff'
    context.font = '600 20px sans-serif'
    context.fillText(track.title.slice(0, 18), x + 58, y + 292)
  }
  return canvas
}

type ContributionInput = { pageNumber: number; type: AlbumElementType; content?: string; author: AuthorIdentity; media?: PhotoDraft; setlist?: SetlistEntry[]; styleVariant?: string }
type ContributionStore = { save: (input: ContributionInput) => Promise<void> }
const overlapRatio = (a: ElementLayout, b: ElementLayout) => { const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)); const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)); return width * height / Math.max(.001, Math.min(a.width * a.height, b.width * b.height)) }
const placeElement = (element: AlbumElement, existing: AlbumElement[]) => { const candidates = [[.08, .08], [.54, .08], [.08, .38], [.54, .38], [.26, .22], [.14, .58], [.48, .58]]; const current = clampLayout(element.layout); const collisionAt = (layout: ElementLayout) => Math.max(0, ...existing.map((other) => overlapRatio(layout, other.layout))); const roomiest = candidates.map(([x, y]) => ({ layout: clampLayout({ ...current, x, y }) })).map(({ layout }) => ({ layout, collision: collisionAt(layout) })).sort((a, b) => a.collision - b.collision)[0]; return { ...(collisionAt(current) > .34 && roomiest ? roomiest.layout : current), zIndex: Math.max(0, ...existing.map((other) => other.layout.zIndex)) + 1 } }

const localContributionStore: ContributionStore = {
  async save(input) {
    const repository = new LocalAlbumRepository()
    const album = await repository.getAlbum()
    const targetPage = album.pages[input.pageNumber - 1]
    if (!targetPage) throw new Error('La página seleccionada no existe.')
    const element = createElement(targetPage.id, input.type, targetPage.elements.length + 1, input.author)
    element.content = input.content || element.content
    element.styleVariant = input.styleVariant ?? element.styleVariant
    element.setlist = input.setlist
    element.media = input.media ? { originalWidth: 0, originalHeight: 0, mimeType: input.media.mime, fileSize: input.media.size, downloadUrl: input.media.data } : undefined
    if (input.type === 'PHOTO') { element.content = input.media?.data; element.layout = { ...element.layout, width: .42, height: .3 } }
    if (input.type === 'SETLIST') element.layout = { ...element.layout, width: .76, height: .34 }
    element.layout = placeElement(element, targetPage.elements)
    await repository.savePage({ ...targetPage, elements: [...targetPage.elements, element], updatedAt: new Date().toISOString() })
  },
}

function TrackCoverFlow({ tracks, selectedIds, onToggle }: { tracks: SetlistTrack[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState(tracks[0]?.id ?? '')
  const resolvedActiveId = tracks.some((track) => track.id === activeId) ? activeId : tracks[0]?.id ?? ''
  const activeIndex = Math.max(0, tracks.findIndex((track) => track.id === resolvedActiveId))
  const activeTrack = tracks[activeIndex]

  const centerTrack = (id: string) => {
    const scroller = scrollerRef.current
    const element = scroller?.querySelector<HTMLElement>(`[data-track-id="${CSS.escape(id)}"]`)
    if (!scroller || !element) return
    setActiveId(id)
    scroller.scrollTo({ left: element.offsetLeft - (scroller.clientWidth - element.offsetWidth) / 2, behavior: 'smooth' })
  }
  const syncCenteredTrack = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const center = scroller.getBoundingClientRect().left + scroller.clientWidth / 2
    const nearest = [...scroller.querySelectorAll<HTMLElement>('[data-track-id]')].sort((left, right) => Math.abs(left.getBoundingClientRect().left + left.clientWidth / 2 - center) - Math.abs(right.getBoundingClientRect().left + right.clientWidth / 2 - center))[0]
    if (nearest?.dataset.trackId) setActiveId(nearest.dataset.trackId)
  }

  return <div className="setlist-coverflow">
    <div className="setlist-coverflow-rail" ref={scrollerRef} onScroll={syncCenteredTrack} aria-label="Canciones del álbum, desliza horizontalmente">
      {tracks.map((track, index) => { const selected = selectedIds.includes(track.id); const position = index < activeIndex ? 'is-before' : index > activeIndex ? 'is-after' : 'is-active'; return <button type="button" key={track.id} data-track-id={track.id} className={`setlist-coverflow-item ${position}${selected ? ' is-selected' : ''}`} aria-label={`${track.title}${selected ? ', seleccionada' : ''}`} aria-pressed={selected} onFocus={() => centerTrack(track.id)} onClick={() => { centerTrack(track.id); onToggle(track.id) }} disabled={!selected && selectedIds.length >= TOP_SIZE}>{track.coverUrl ? <img src={resolveSetlistCoverUrl(track.coverUrl)} alt="" /> : <span className="setlist-coverflow-placeholder">{String(index + 1).padStart(2, '0')}</span>}</button> })}
    </div>
    {activeTrack && <p className="setlist-coverflow-caption" aria-live="polite"><b>{activeTrack.title}</b><small>{selectedIds.includes(activeTrack.id) ? 'Seleccionada' : 'Desliza para explorar · toca para seleccionar'}</small></p>}
  </div>
}

export function SimplePageSetlistContributePage() {
  const [type, setType] = useState<ContributionType>('SETLIST')
  const [postItColor, setPostItColor] = useState('yellow')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')
  const [photo, setPhoto] = useState<PhotoDraft | null>(null)
  const [tracks, setTracks] = useState<SetlistTrack[]>(readSetlistTracks)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeTop, setActiveTop] = useState<TopSelectionType>('HOSHI')
  const [trackSearch, setTrackSearch] = useState('')
  const [expandedAlbums, setExpandedAlbums] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const session = useGoogleSession()
  const participation = useParticipationAccess()
  const isOpen = participation.isOpen

  useEffect(() => {
    const catalog = () => setTracks(readSetlistTracks())
    const unsubscribe = setlistCatalogRepository.subscribe((remoteTracks) => { if (remoteTracks.length) setTracks(remoteTracks) }, () => undefined)
    window.addEventListener('brattypolitan-setlist-change', catalog)
    return () => { unsubscribe?.(); window.removeEventListener('brattypolitan-setlist-change', catalog) }
  }, [])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [])

  const displayName = name.trim() || session.user?.displayName || ''
  const author = (): AuthorIdentity => ({ participantId: session.user?.uid ?? idForParticipant(), displayName: displayName || undefined, age: age ? Number(age) : undefined })
  const trackGroups = setlistAlbumOrder
    .filter((album) => activeTop === 'BRATTY' || album === 'HOSHI')
    .map((album) => ({ album, tracks: tracks.filter((track) => getSetlistAlbum(track) === album) }))
  const availableTracks = trackGroups.flatMap((group) => group.tracks)
  const normalizedSearch = trackSearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  const visibleTrackGroups = trackGroups.map((group) => ({
    ...group,
    visibleTracks: normalizedSearch
      ? group.tracks.filter((track) => track.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedSearch))
      : group.tracks,
  })).filter((group) => !normalizedSearch || group.visibleTracks.length)
  const visibleResultCount = visibleTrackGroups.reduce((total, group) => total + group.visibleTracks.length, 0)
  const selectedTracks = availableTracks.filter((track) => selectedIds.includes(track.id))
  const selectionTitle = topTitles[activeTop]
  const lastSelectedTrack = [...selectedIds].reverse().map((id) => availableTracks.find((track) => track.id === id)).find((track): track is SetlistTrack => Boolean(track))
  const defaultSelectionBackground = activeTop === 'HOSHI' ? '/images/hoshi-top3-eyes.jpg' : '/images/bratty-top3-boxing.jpg'
  const selectionBackground = lastSelectedTrack?.coverUrl
    ? resolveSetlistCoverUrl(lastSelectedTrack.coverUrl) ?? defaultSelectionBackground
    : defaultSelectionBackground
  const selectionPanelStyle = { '--top3-selection-background': `url("${selectionBackground.replace(/["\\]/g, '\\$&')}")` } as CSSProperties

  const toggleCollectiveArchive = async () => {
    try { await participation.setOpen(!participation.isOpen) }
    catch { setMessage('No fue posible actualizar la apertura para todos los dispositivos.') }
  }
  const openTopSelection = (selection: TopSelectionType) => {
    if (!setlistCatalogRepository.usesFirebase) setTracks(readSetlistTracks())
    setActiveTop(selection)
    setSelectedIds([])
    setTrackSearch('')
    setExpandedAlbums([])
    setPreview(false)
    setExpanded(true)
    window.requestAnimationFrame(() => document.querySelector('.setlist-modal')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const toggleAlbum = (album: string) => setExpandedAlbums((current) => current.includes(album) ? current.filter((item) => item !== album) : [...current, album])
  const toggleTrack = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= TOP_SIZE ? current : [...current, id])
  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) { setMessage('Selecciona una imagen de máximo 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => setPhoto({ data: String(reader.result), size: file.size, mime: file.type })
    reader.readAsDataURL(file)
    event.target.value = ''
  }
  const saveImage = async () => {
    try {
      const canvas = await makePreview(selectedTracks, displayName, page, selectionTitle)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('No fue posible preparar el PNG.')
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${activeTop === 'HOSHI' ? 'top-3-hoshi' : 'top-3-bratty'}.png`
      link.rel = 'noopener'
      link.hidden = true
      document.body.appendChild(link)
      link.click()
      window.setTimeout(() => { link.remove(); URL.revokeObjectURL(downloadUrl) }, 30_000)
    } catch { setMessage('No fue posible crear la imagen de vista previa.') }
  }
  const shareImage = async () => {
    try {
      const canvas = await makePreview(selectedTracks, displayName, page, selectionTitle)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error()
      const file = new File([blob], `${activeTop === 'HOSHI' ? 'top-3-hoshi' : 'top-3-bratty'}.png`, { type: 'image/png' })
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) await navigator.share({ title: `${selectionTitle} · BRATTYPOLITAN EXPERIENCE`, files: [file] })
      else { await navigator.clipboard?.writeText(`${selectionTitle}: ${selectedTracks.map((track) => track.title).join(', ')}`); setMessage('La selección se copió para compartirla.') }
    } catch (error) { if ((error as DOMException).name !== 'AbortError') setMessage('No fue posible compartir la vista previa.') }
  }
  const saveElement = async () => {
    if (type === 'PHOTO' && !photo) { setMessage('Selecciona una foto de máximo 5 MB.'); return }
    if (type !== 'PHOTO' && !content.trim()) { setMessage('Escribe o selecciona el contenido de tu recuerdo.'); return }
    try {
      const identity = author()
      await localContributionStore.save({ pageNumber: page, type: type as AlbumElementType, content, author: identity, media: photo ?? undefined, styleVariant: type === 'POST_IT' ? postItColor : undefined })
      setMessage(`Recuerdo guardado en la página ${page}. ID: ${identity.participantId}`)
      setContent('')
      setPhoto(null)
    } catch { setMessage('No fue posible guardar el recuerdo localmente.') }
  }
  const sendTop = async () => {
    if (selectedTracks.length !== TOP_SIZE) { setMessage('Selecciona exactamente tres canciones antes de enviar.'); return }
    const identity = author()
    try {
      await localContributionStore.save({ pageNumber: page, type: 'SETLIST', content: selectionTitle, author: identity, setlist: selectedTracks.map(({ id, title, coverUrl }) => ({ id, title, coverUrl })) })
      setMessage(`Top 3 guardado en la página ${page}. ID: ${identity.participantId}`)
      setSelectedIds([])
      setPreview(false)
      setExpanded(false)
    } catch { setMessage('No fue posible guardar el Top 3 localmente.') }
  }

  return <Layout>
    <section className="content-card contribution">
      <p className="eyebrow">ARCHIVO COLECTIVO · PRUEBA LOCAL</p>
      <h1>Dejar un recuerdo</h1>
      {session.isAdmin && <section className="archive-admin-control"><p>Vista administradora · archivo {isOpen ? 'activo' : 'desactivado'}</p><button type="button" onClick={toggleCollectiveArchive}>{isOpen ? 'Desactivar archivo colectivo' : 'Activar archivo colectivo'}</button></section>}
      {!isOpen ? <p className="muted">La captura está cerrada por el equipo.</p> : <div className="contribution-form">
        <p>Elige qué tipo de recuerdo quieres dejar. Recibirás un ID único y se guardará en la página seleccionada.</p>
        <label>Tipo de recuerdo<select value={type} onChange={(event) => { setType(event.target.value as ContributionType); setExpanded(false); setPreview(false) }}><option value="SETLIST">Top 3 musical</option><option value="PHOTO">Foto</option><option value="STICKER">Sticker</option><option value="POST_IT">Post-it</option><option value="TEXT">Texto libre</option></select></label>
        <label>Nombre (opcional)<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Edad (opcional)<input type="number" min="1" max="120" value={age} onChange={(event) => setAge(event.target.value)} /></label>
        <section className="memory-page-picker"><p>¿En qué página dejaste o dejarás tu recuerdo?</p><small>Selecciona una página de la libreta digital.</small><div><button type="button" onClick={() => setPage((current) => withinPageRange(current - 1))} disabled={page === 1}>−</button><label>Página<input type="number" min="1" max="100" value={page} onChange={(event) => setPage(withinPageRange(Number(event.target.value)))} /></label><button type="button" onClick={() => setPage((current) => withinPageRange(current + 1))} disabled={page === 100}>+</button><button type="button" className="memory-page-open" onClick={() => window.location.assign(`/album?page=${page}`)}>Ver hoja</button></div></section>
        {type === 'SETLIST' ? <section className="top3-launchers" aria-label="Elige tu tipo de Top 3"><button type="button" className="setlist-launcher" onClick={() => openTopSelection('HOSHI')}><b>✦ MI TOP 3 DE HOSHI</b><span>Selecciona 3 canciones de Hoshi</span></button><button type="button" className="setlist-launcher is-all-bratty" onClick={() => openTopSelection('BRATTY')}><b>✦ MI TOP 3 DE TODA LA MÚSICA DE BRATTY</b><span>Selecciona 3 canciones del catálogo completo</span></button></section> : type === 'PHOTO' ? <label>Foto · máximo 5 MB<input type="file" accept="image/*" onChange={choosePhoto} />{photo && <small>{(photo.size / 1024 / 1024).toFixed(2)} MB lista</small>}</label> : <>{type === 'POST_IT' && <fieldset className="postit-color-picker"><legend>Color del post-it</legend><div>{postItColors.map(([value, label]) => <button key={value} type="button" className={`postit-color postit-${value}${postItColor === value ? ' is-selected' : ''}`} aria-label={label} aria-pressed={postItColor === value} title={label} onClick={() => setPostItColor(value)} />)}</div></fieldset>}<label>{type === 'STICKER' ? 'Sticker o emoji' : type === 'POST_IT' ? 'Texto del post-it' : 'Texto libre'}<textarea maxLength={280} value={content} onChange={(event) => setContent(event.target.value)} placeholder={type === 'STICKER' ? '✦ 💖 ⭐' : 'Escribe aquí…'} /></label></>}
        {type !== 'SETLIST' && <button type="button" onClick={() => void saveElement()}>Guardar recuerdo en la libreta</button>}
        {message && <p className="muted">{message}</p>}
      </div>}
    </section>
    {expanded && <section className="setlist-modal" aria-label={selectionTitle}><div className="setlist-modal-panel" style={selectionPanelStyle}>{preview ? <><p className="eyebrow">VISTA PREVIA</p><h2>Tu selección</h2><div className="setlist-preview-card"><header><span>BRATTYPOLITAN <ExperienceWord /></span><strong>{selectionTitle}</strong><small>{displayName || 'PARTICIPANTE ANÓNIMO'} · PÁGINA {page}</small></header><ol>{selectedTracks.map((track, index) => <li key={track.id}><span className="setlist-preview-album-blur" style={track.coverUrl ? { backgroundImage: `url(${resolveSetlistCoverUrl(track.coverUrl)})` } : undefined} aria-hidden="true" />{track.coverUrl ? <img src={resolveSetlistCoverUrl(track.coverUrl)} alt="" /> : <span className="setlist-preview-cover-placeholder">{String(index + 1).padStart(2, '0')}</span>}<b>{track.title}</b></li>)}</ol></div><footer className="setlist-preview-actions"><button type="button" onClick={() => void saveImage()}>Descargar imagen</button><button type="button" onClick={() => void shareImage()}>Compartir imagen</button><button type="button" className="setlist-send" onClick={() => void sendTop()}>Guardar en la libreta</button></footer><button type="button" className="setlist-back" onClick={() => setPreview(false)}>← Volver a editar</button></> : <><p className="eyebrow">TOP 3 · PÁGINA {page}</p><h2>{selectionTitle}</h2><output className="setlist-count">{selectedIds.length} / {TOP_SIZE} seleccionadas</output>{availableTracks.length ? <><label className="setlist-search"><span>Buscar una canción</span><input type="search" value={trackSearch} onChange={(event) => setTrackSearch(event.target.value)} placeholder={activeTop === 'HOSHI' ? 'Busca dentro de HOSHI…' : 'Busca en toda la música de Bratty…'} autoComplete="off" /><small role="status" aria-live="polite">{visibleResultCount} {visibleResultCount === 1 ? 'resultado' : 'resultados'}</small></label>{visibleTrackGroups.length ? <div className="setlist-album-groups">{visibleTrackGroups.map((group) => { const open = expandedAlbums.includes(group.album) || Boolean(normalizedSearch && group.visibleTracks.length); const cover = group.tracks.find((track) => track.coverUrl)?.coverUrl; const panelId = `album-${group.album.toLowerCase()}-tracks`; return <section className={`setlist-album-group${open ? ' is-open' : ''}`} key={group.album}><button type="button" className="setlist-album-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => toggleAlbum(group.album)}><span className="setlist-album-art">{cover ? <img src={resolveSetlistCoverUrl(cover)} alt="" /> : <i aria-hidden="true">✦</i>}</span><span className="setlist-album-meta"><b>{setlistAlbumLabels[group.album]}</b><small>{group.visibleTracks.length === group.tracks.length ? `${group.tracks.length} canciones` : `${group.visibleTracks.length} de ${group.tracks.length} canciones`}</small></span><i className="setlist-album-chevron" aria-hidden="true" /></button>{open && <div id={panelId} className="setlist-album-catalog">{group.visibleTracks.length ? <TrackCoverFlow tracks={group.visibleTracks} selectedIds={selectedIds} onToggle={toggleTrack} /> : <p className="setlist-album-empty">No hay canciones de este álbum que coincidan con la búsqueda.</p>}</div>}</section> })}</div> : <p className="setlist-search-empty">No encontramos canciones que coincidan con tu búsqueda.</p>}</> : <p className="setlist-empty">{activeTop === 'HOSHI' ? 'Todavía no hay canciones asociadas a la portada Hoshi.' : 'El equipo todavía no ha clasificado canciones en estos álbumes.'}</p>}<footer><button type="button" className="setlist-cancel" onClick={() => setExpanded(false)}>Cancelar</button><button type="button" className="setlist-send" onClick={() => setPreview(true)} disabled={selectedIds.length !== TOP_SIZE}>Ver vista previa</button></footer></>}</div></section>}
  </Layout>
}
