import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import '../styles/setlist-preview.css'
import { Layout } from '../components/Layout'
import { ExperienceWord } from '../components/BrattypolitanWordmark'
import { FourPointMark } from '../components/FourPointMark'
import { useGoogleSession } from '../features/access/useGoogleSession'
import { useParticipationAccess } from '../features/album/hooks/useParticipationAccess'
import { getSetlistAlbum, getSetlistGroupCovers, readSetlistTracks, setlistAlbumLabels, setlistAlbumOrder, type SetlistTrack } from '../features/album/data/localSetlistCatalog'
import { resolveSetlistCoverUrl, setlistCatalogRepository } from '../features/album/repositories/SetlistCatalogRepository'
import { type AlbumElementType, type AuthorIdentity, type ContentVisibility } from '../features/album/domain/types'
import { getLocalParticipantId } from '../features/album/domain/participantIdentity'
import { PageIndex } from '../features/album/components/PageIndex'
import { useAlbum } from '../features/album/hooks/useAlbum'
import type { CommunitySticker } from '../features/stickers/domain/types'
import { StickerPicker } from '../features/stickers/components/StickerPicker'
import { StickerUploader } from '../features/stickers/components/StickerUploader'
import { validatePhotoFile, type ValidatedPhotoFile } from '../features/media/domain/photoValidation'
import { photoStorageRepository } from '../features/media/repositories'
import { contributionRepository } from '../features/contributions/repositories'
import { availableSlots, recommendedPageNumber } from '../features/contributions/domain/pageAvailability'
import { usePageAvailability } from '../features/contributions/hooks/usePageAvailability'
import { ContributionConfirmation } from '../features/contributions/components/ContributionConfirmation'

const TOP_SIZE = 3
const WIZARD_TOTAL = 5
const postItColors = [
  ['yellow', 'Amarillo'], ['green', 'Verde'], ['blue', 'Azul'], ['purple', 'Morado'], ['pink', 'Rosa'], ['red', 'Rojo'], ['brown', 'Café'], ['violet', 'Violeta'], ['white', 'Blanco'], ['black', 'Negro'], ['gray', 'Gris'], ['dark-green', 'Verde oscuro'], ['royal-blue', 'Azul rey'], ['cyan', 'Azul cian'], ['pride', 'Orgullo LGBT+'],
] as const

type ContributionType = AlbumElementType | 'SETLIST'
type TopSelectionType = 'HOSHI' | 'BRATTY'
type PhotoDraft = { file: File; validation: ValidatedPhotoFile }

const contributionErrorMessage = (error: unknown, fallback: string) => {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('permission-denied')) return 'Tu sesión no pudo autorizar el envío. Vuelve a acceder con Google e inténtalo de nuevo.'
  return error instanceof Error ? error.message : fallback
}

const contributionOptions: { value: ContributionType; icon: string; title: string; copy: string }[] = [
  { value: 'SETLIST', icon: '♫', title: 'Top 3 musical', copy: 'Elige las tres canciones que más te acompañan.' },
  { value: 'PHOTO', icon: '▣', title: 'Una foto', copy: 'Guarda una imagen dentro de la libreta.' },
  { value: 'STICKER', icon: '✦', title: 'Sticker o emoji', copy: 'Deja un símbolo pequeño y lleno de intención.' },
  { value: 'POST_IT', icon: '▤', title: 'Post-it', copy: 'Escribe una nota y elige su color.' },
  { value: 'TEXT', icon: 'Aa', title: 'Texto libre', copy: 'Dedícale unas palabras a BRATTY.' },
]

const topTitles: Record<TopSelectionType, string> = {
  HOSHI: 'MI TOP 3 DE HOSHI',
  BRATTY: 'MI TOP 3 DE TODA LA MÚSICA DE BRATTY',
}
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

function TrackCoverFlow({ tracks, selectedIds, onToggle }: { tracks: SetlistTrack[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const scrollSettleRef = useRef<number | null>(null)
  const [activeId, setActiveId] = useState(tracks[0]?.id ?? '')
  const resolvedActiveId = tracks.some((track) => track.id === activeId) ? activeId : tracks[0]?.id ?? ''
  const activeIndex = Math.max(0, tracks.findIndex((track) => track.id === resolvedActiveId))
  const activeTrack = tracks[activeIndex]

  useEffect(() => () => {
    if (scrollSettleRef.current !== null) window.clearTimeout(scrollSettleRef.current)
  }, [])

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
    const center = scroller.scrollLeft + scroller.clientWidth / 2
    let nearest: HTMLElement | undefined
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const element of scroller.querySelectorAll<HTMLElement>('[data-track-id]')) {
      const distance = Math.abs(element.offsetLeft + element.offsetWidth / 2 - center)
      if (distance < nearestDistance) { nearest = element; nearestDistance = distance }
    }
    if (nearest?.dataset.trackId) setActiveId(nearest.dataset.trackId)
  }
  const scheduleCenteredTrackSync = () => {
    if (scrollSettleRef.current !== null) window.clearTimeout(scrollSettleRef.current)
    scrollSettleRef.current = window.setTimeout(syncCenteredTrack, 120)
  }

  return <div className="setlist-coverflow">
    <div className="setlist-coverflow-rail" ref={scrollerRef} onScroll={scheduleCenteredTrackSync} aria-label="Canciones del álbum, desliza horizontalmente">
      {tracks.map((track, index) => { const selected = selectedIds.includes(track.id); const position = index < activeIndex ? 'is-before' : index > activeIndex ? 'is-after' : 'is-active'; return <button type="button" key={track.id} data-track-id={track.id} className={`setlist-coverflow-item ${position}${selected ? ' is-selected' : ''}`} aria-label={`${track.title}${selected ? ', seleccionada' : ''}`} aria-pressed={selected} onClick={() => { centerTrack(track.id); onToggle(track.id) }} disabled={!selected && selectedIds.length >= TOP_SIZE}>{track.coverUrl ? <img src={resolveSetlistCoverUrl(track.coverUrl)} alt="" /> : <span className="setlist-coverflow-placeholder">{String(index + 1).padStart(2, '0')}</span>}</button> })}
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
  const [visibility, setVisibility] = useState<ContentVisibility>('PUBLIC')
  const [photo, setPhoto] = useState<PhotoDraft | null>(null)
  const photoPreviewUrl = useMemo(() => photo ? URL.createObjectURL(photo.file) : null, [photo])
  const [tracks, setTracks] = useState<SetlistTrack[]>(readSetlistTracks)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeTop, setActiveTop] = useState<TopSelectionType>('HOSHI')
  const [trackSearch, setTrackSearch] = useState('')
  const [expandedAlbums, setExpandedAlbums] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'uploading' | 'saving' | 'sent' | 'error'>('idle')
  const submitLock = useRef(false)
  const submissionId = useRef<string | null>(null)
  const uploadToken = useRef<string | null>(null)
  const uploadedPhoto = useRef<Awaited<ReturnType<typeof photoStorageRepository.uploadPhoto>> | null>(null)
  const [selectedSticker, setSelectedSticker] = useState<CommunitySticker | null>(null)
  const [pageSelectorOpen, setPageSelectorOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward')
  const wizardPanelRef = useRef<HTMLElement>(null)
  const manuallySelectedPage = useRef(false)
  const seededGoogleName = useRef(false)
  const session = useGoogleSession()
  const participation = useParticipationAccess()
  const scrapbook = useAlbum()
  const availability = usePageAvailability()
  const isOpen = participation.isOpen

  useEffect(() => {
    const catalog = () => setTracks(readSetlistTracks())
    const unsubscribe = setlistCatalogRepository.subscribe((remoteTracks) => { if (remoteTracks.length) setTracks(remoteTracks) }, () => undefined)
    window.addEventListener('brattypolitan-setlist-change', catalog)
    return () => { unsubscribe?.(); window.removeEventListener('brattypolitan-setlist-change', catalog) }
  }, [])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [])
  useEffect(() => () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl) }, [photoPreviewUrl])
  useEffect(() => {
    if (!seededGoogleName.current && session.user?.displayName) {
      seededGoogleName.current = true
      setName((current) => current || session.user?.displayName || '')
    }
  }, [session.user?.displayName])
  useEffect(() => { wizardPanelRef.current?.focus({ preventScroll: true }) }, [step])
  const displayName = name.trim() || session.user?.displayName || ''
  const author = (): AuthorIdentity => ({ participantId: session.user?.uid ?? getLocalParticipantId(), displayName: displayName || undefined, age: age ? Number(age) : undefined })
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
  const openSpaces = scrapbook.album ? availableSlots(scrapbook.album.pages[page - 1], availability.pending, type as AlbumElementType) : null
  const pageIsFull = openSpaces !== null && openSpaces < 1
  const recommendedPage = scrapbook.album ? recommendedPageNumber(scrapbook.album.pages, availability.pending, type as AlbumElementType) : null
  useEffect(() => {
    if (!manuallySelectedPage.current && recommendedPage && page !== recommendedPage) setPage(recommendedPage)
  }, [page, recommendedPage])
  const submissionBusy = submitPhase === 'uploading' || submitPhase === 'saving'
  const startAnother = () => {
    submissionId.current = null
    uploadToken.current = null
    uploadedPhoto.current = null
    setSubmitPhase('idle')
    setMessage(null)
    setContent('')
    setPhoto(null)
    setSelectedSticker(null)
    setSelectedIds([])
    moveToStep(2)
  }

  const moveToStep = (next: number) => {
    const bounded = Math.max(0, Math.min(WIZARD_TOTAL - 1, next))
    setStepDirection(bounded >= step ? 'forward' : 'back')
    setStep(bounded)
    setMessage(null)
  }
  const chooseContributionType = (nextType: ContributionType) => {
    setType(nextType)
    manuallySelectedPage.current = false
    setExpanded(false)
    setPreview(false)
    setMessage(null)
  }

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
  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    try {
      setPhoto({ file, validation: await validatePhotoFile(file) })
      submissionId.current = null
      uploadToken.current = null
      uploadedPhoto.current = null
      setSubmitPhase('idle')
      setMessage(null)
    }
    catch (error) { setPhoto(null); setMessage(error instanceof Error ? error.message : 'No fue posible validar la foto.') }
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
    if (submitLock.current || submitPhase === 'sent') return
    if (!session.user) { setMessage('Accede con Google para enviar tu aportación a revisión.'); return }
    if (type === 'PHOTO' && !photo) { setMessage('Selecciona una foto de máximo 5 MB.'); return }
    if (type === 'STICKER' && !selectedSticker) { setMessage('Elige un sticker aprobado de la biblioteca.'); return }
    if (type !== 'PHOTO' && type !== 'STICKER' && !content.trim()) { setMessage('Escribe o selecciona el contenido de tu recuerdo.'); return }
    submitLock.current = true
    submissionId.current ??= crypto.randomUUID()
    uploadToken.current ??= `${crypto.randomUUID()}${crypto.randomUUID()}`
    try {
      const identity = author()
      const firebaseIdToken = photo && session.user ? await session.user.getIdToken() : undefined
      if (photo && !uploadedPhoto.current) {
        setSubmitPhase('uploading')
        uploadedPhoto.current = await photoStorageRepository.uploadPhoto(photo.file, photo.validation, identity.participantId, firebaseIdToken, submissionId.current, uploadToken.current)
      }
      setSubmitPhase('saving')
      await contributionRepository.submit({ id: submissionId.current, pageNumber: page, type: type as AlbumElementType, content: type === 'STICKER' ? selectedSticker?.title : content, author: identity, visibility, media: uploadedPhoto.current?.media, styleVariant: type === 'POST_IT' ? postItColor : undefined, stickerId: selectedSticker?.id })
      setMessage(`Aportación enviada a revisión para la página ${page}.`)
      setSubmitPhase('sent')
      setContent('')
      setPhoto(null)
      setSelectedSticker(null)
    } catch (error) {
      setSubmitPhase('error')
      setMessage(contributionErrorMessage(error, 'No fue posible guardar el recuerdo.'))
    } finally { submitLock.current = false }
  }
  const sendTop = async () => {
    if (submitLock.current || submitPhase === 'sent') return
    if (!session.user) { setMessage('Accede con Google para enviar tu Top 3 a revisión.'); return }
    if (selectedTracks.length !== TOP_SIZE) { setMessage('Selecciona exactamente tres canciones antes de enviar.'); return }
    const identity = author()
    submitLock.current = true
    submissionId.current ??= crypto.randomUUID()
    try {
      setSubmitPhase('saving')
      await contributionRepository.submit({ id: submissionId.current, pageNumber: page, type: 'SETLIST', content: selectionTitle, author: identity, visibility, setlist: selectedTracks.map(({ id, title, coverUrl }) => ({ id, title, coverUrl })) })
      setMessage(`Top 3 enviado a revisión para la página ${page}.`)
      setSubmitPhase('sent')
      setSelectedIds([])
      setPreview(false)
      setExpanded(false)
    } catch (error) { setSubmitPhase('error'); setMessage(contributionErrorMessage(error, 'No fue posible guardar el Top 3.')) }
    finally { submitLock.current = false }
  }

  return <Layout>
    <section className="content-card contribution">
      <p className="eyebrow">ARCHIVO COLECTIVO · MODERACIÓN ACTIVA</p>
      <h1>Dejar un recuerdo</h1>
      {session.isAdmin && <section className="archive-admin-control"><p>Vista administradora · archivo {isOpen ? 'activo' : 'desactivado'}</p><button type="button" onClick={toggleCollectiveArchive}>{isOpen ? 'Desactivar archivo colectivo' : 'Activar archivo colectivo'}</button></section>}
      {!isOpen ? <p className="muted">La captura está cerrada por el equipo.</p> : session.isLoading ? <p className="muted">Comprobando acceso…</p> : !session.user ? <section className="contribution-access-card"><p className="memory-wizard-kicker">ACCESO NECESARIO</p><h2>Accede antes de dejar tu recuerdo</h2><p>Las cuentas registradas pueden seguir aportando normalmente. Si es tu primera vez, entra con Google para crear tu perfil y proteger tu envío.</p><button type="button" onClick={() => void session.signIn()}>Acceder con Google</button>{session.error && <p role="alert">{session.error}</p>}</section> : <div className="contribution-form contribution-wizard">
        <header className="memory-wizard-progress">
          <span className="memory-wizard-star"><FourPointMark /></span>
          <div><p>PASO {step + 1} DE {WIZARD_TOTAL}</p><span>Tu recuerdo para BRATTY</span></div>
          <div className="memory-wizard-progressbar" role="progressbar" aria-label="Progreso del recuerdo" aria-valuemin={1} aria-valuemax={WIZARD_TOTAL} aria-valuenow={step + 1}><i style={{ width: `${((step + 1) / WIZARD_TOTAL) * 100}%` }} /></div>
        </header>

        <section ref={wizardPanelRef} key={step} tabIndex={-1} className={`memory-wizard-step is-${stepDirection}`} aria-labelledby={`memory-step-${step}`}>
          {step === 0 && <>
            <p className="memory-wizard-kicker">EMPECEMOS CONTIGO</p>
            <h2 id="memory-step-0">¿Cuál es tu nombre?</h2>
            <p>{session.user?.displayName ? `Hola, ${session.user.displayName}. Tomamos el nombre de tu cuenta de Google, pero puedes cambiar cómo aparecerá.` : 'Puedes escribir tu nombre o continuar de forma anónima.'}</p>
            <label className="memory-wizard-field"><span>Tu nombre <small>opcional</small></span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Escribe tu nombre" /></label>
          </>}

          {step === 1 && <>
            <p className="memory-wizard-kicker">UN POCO MÁS SOBRE TI</p>
            <h2 id="memory-step-1">¿Cuál es tu edad?</h2>
            <p>Este dato es opcional. Puedes dejarlo vacío y seguir adelante.</p>
            <label className="memory-wizard-field"><span>Tu edad <small>opcional</small></span><input inputMode="numeric" type="number" min="1" max="120" value={age} onChange={(event) => setAge(event.target.value)} placeholder="Edad" /></label>
          </>}

          {step === 2 && <>
            <p className="memory-wizard-kicker">ELIGE TU FORMA DE PARTICIPAR</p>
            <h2 id="memory-step-2">¿Qué quieres dejarle a BRATTY?</h2>
            <p>Todo formará parte de la misma libreta. Elige la forma que mejor represente tu recuerdo.</p>
            <div className="memory-type-grid" role="list">{contributionOptions.map((option) => <button type="button" role="listitem" key={option.value} className={type === option.value ? 'is-selected' : ''} aria-pressed={type === option.value} onClick={() => chooseContributionType(option.value)}><i aria-hidden="true">{option.icon}</i><span><b>{option.title}</b><small>{option.copy}</small></span></button>)}</div>
          </>}

          {step === 3 && <>
            <p className="memory-wizard-kicker">BUSCA UN ESPACIO</p>
            <h2 id="memory-step-3">¿En qué cara irá tu recuerdo?</h2>
            <p>{type === 'STICKER' ? 'Cada cara admite hasta diez stickers, contados aparte de los demás recuerdos.' : 'Cada cara admite hasta cuatro recuerdos principales.'} Puedes revisar la hoja antes de continuar.</p>
            <section className={`memory-page-picker memory-page-picker--wizard${pageIsFull ? ' is-full' : ''}`}><strong>Cara {page}</strong><small>{openSpaces !== null ? pageIsFull ? 'Esta cara ya está llena para este tipo de recuerdo. Elige otra para continuar.' : `${openSpaces} ${type === 'STICKER' ? 'de 10 lugares para stickers' : 'de 4 lugares para recuerdos'} disponibles.` : 'Consultando espacios disponibles…'}</small><div><button type="button" onClick={() => setPageSelectorOpen(true)}>Elegir otra cara</button><button type="button" className="memory-page-open" onClick={() => window.location.assign(`/album?page=${page}`)}>Ver cara</button></div></section>
          </>}

          {step === 4 && (submitPhase === 'sent' ? <div className="memory-wizard-sent"><ContributionConfirmation message={message ?? 'Aportación enviada a revisión.'} /><button type="button" onClick={startAnother}>Dejar otro recuerdo</button></div> : <>
            <p className="memory-wizard-kicker">ÚLTIMO PASO · CARA {page}</p>
            <fieldset className="memory-visibility-picker">
              <legend>¿Quién podrá ver tu aportación?</legend>
              <button type="button" className={visibility === 'PUBLIC' ? 'is-selected' : ''} aria-pressed={visibility === 'PUBLIC'} onClick={() => setVisibility('PUBLIC')}><b>Pública</b><span>Todas las personas podrán verla completa.</span></button>
              <button type="button" className={visibility === 'PRIVATE' ? 'is-selected' : ''} aria-pressed={visibility === 'PRIVATE'} onClick={() => setVisibility('PRIVATE')}><b>Privada</b><span>Solo tú, administración y usuarios especiales verán el contenido.</span></button>
            </fieldset>
            {type === 'SETLIST' ? <><h2 id="memory-step-4">Elige tus tres canciones</h2><p>Arma tu Top 3 y revisa la vista previa antes de guardarlo en la libreta.</p><section className="top3-launchers" aria-label="Elige tu tipo de Top 3"><button type="button" className="setlist-launcher" onClick={() => openTopSelection('HOSHI')}><b>✦ MI TOP 3 DE HOSHI</b><span>Selecciona 3 canciones de Hoshi</span></button><button type="button" className="setlist-launcher is-all-bratty" onClick={() => openTopSelection('BRATTY')}><b>✦ MI TOP 3 DE TODA LA MÚSICA DE BRATTY</b><span>Selecciona 3 canciones del catálogo completo</span></button></section></> : type === 'PHOTO' ? <><h2 id="memory-step-4">Elige una foto para BRATTY</h2><p>Selecciona una imagen de máximo 5 MB y, si quieres, cuéntanos brevemente qué significa para ti.</p><label className={`memory-photo-input${photoPreviewUrl ? ' has-preview' : ''}`}>{photoPreviewUrl && <span className="memory-photo-preview"><img src={photoPreviewUrl} alt="Vista previa de la foto seleccionada" /></span>}<span className="memory-photo-action">{photo ? 'Cambiar foto' : 'Seleccionar foto'}</span><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => void choosePhoto(event)} />{photo && <small>{(photo.validation.fileSize / 1024 / 1024).toFixed(2)} MB · lista para guardar</small>}</label><label className="memory-wizard-field memory-wizard-message memory-photo-caption"><span>Texto debajo de la foto <small>opcional</small></span><textarea maxLength={180} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Cuéntanos algo sobre este momento…" /><small>{content.length} / 180</small></label><button type="button" className="memory-save-button" onClick={() => void saveElement()} disabled={submissionBusy || !photo}>{submitPhase === 'uploading' ? 'Subiendo…' : submitPhase === 'saving' ? 'Guardando…' : 'Guardar recuerdo en la libreta'}</button></> : type === 'STICKER' ? <><h2 id="memory-step-4">Elige un sticker para BRATTY</h2><p>Selecciona uno aprobado para colocarlo en la libreta o aporta uno nuevo para revisión.</p><StickerPicker selectedId={selectedSticker?.id} onSelect={setSelectedSticker} /><StickerUploader defaultAuthorName={displayName} /><button type="button" className="memory-save-button" onClick={() => void saveElement()} disabled={submissionBusy || !selectedSticker}>{submitPhase === 'saving' ? 'Guardando…' : 'Colocar sticker en la libreta'}</button></> : <><h2 id="memory-step-4">¿Qué le quieres escribir a BRATTY?</h2><p>Escribe algo que te gustaría que encontrara al abrir esta página.</p>{type === 'POST_IT' && <fieldset className="postit-color-picker"><legend>Color del post-it</legend><div>{postItColors.map(([value, label]) => <button key={value} type="button" className={`postit-color postit-${value}${postItColor === value ? ' is-selected' : ''}`} aria-label={label} aria-pressed={postItColor === value} title={label} onClick={() => setPostItColor(value)} />)}</div></fieldset>}<label className="memory-wizard-field memory-wizard-message"><span>{type === 'POST_IT' ? 'Tu mensaje' : 'Tu mensaje para BRATTY'}</span><textarea maxLength={280} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escribe aquí…" /><small>{content.length} / 280</small></label><button type="button" className="memory-save-button" onClick={() => void saveElement()} disabled={submissionBusy || !content.trim()}>{submitPhase === 'saving' ? 'Guardando…' : 'Guardar recuerdo en la libreta'}</button></>}
            {submissionBusy && <p className="memory-wizard-status" role="status">{submitPhase === 'uploading' ? 'Subiendo…' : 'Guardando…'}</p>}
            {message && <p className="memory-wizard-status" role="status">{message}</p>}
          </>)}
        </section>

        <footer className="memory-wizard-actions">
          {step > 0 ? <button type="button" className="memory-wizard-back" disabled={submissionBusy || submitPhase === 'sent'} onClick={() => moveToStep(step - 1)}>← Anterior</button> : <span />}
          {step < WIZARD_TOTAL - 1 && <button type="button" className="memory-wizard-next" onClick={() => moveToStep(step + 1)} disabled={step === 3 && pageIsFull}>Continuar <span aria-hidden="true">→</span></button>}
        </footer>
      </div>}
    </section>
    <PageIndex open={pageSelectorOpen} pages={scrapbook.album?.pages} pageCount={scrapbook.album?.pageCount ?? 100} current={page} ownerId={session.user?.uid ?? getLocalParticipantId()} mode="select" contributionType={type === 'STICKER' ? 'STICKER' : 'MAIN'} pending={availability.pending} title="Elige una cara con espacio" onClose={() => setPageSelectorOpen(false)} onGoTo={(selected) => { manuallySelectedPage.current = true; setPage(selected) }} />
    {expanded && <section className="setlist-modal" aria-label={selectionTitle}><div className="setlist-modal-panel" style={selectionPanelStyle}>{preview ? <>
      <p className="eyebrow">VISTA PREVIA</p><h2>Tu selección</h2><div className="setlist-preview-card"><header><span>BRATTYPOLITAN <ExperienceWord /></span><strong>{selectionTitle}</strong><small>{displayName || 'PARTICIPANTE ANÓNIMO'} · PÁGINA {page}</small></header><ol>{selectedTracks.map((track, index) => <li key={track.id}><span className="setlist-preview-album-blur" style={track.coverUrl ? { backgroundImage: `url(${resolveSetlistCoverUrl(track.coverUrl)})` } : undefined} aria-hidden="true" />{track.coverUrl ? <img src={resolveSetlistCoverUrl(track.coverUrl)} alt="" /> : <span className="setlist-preview-cover-placeholder">{String(index + 1).padStart(2, '0')}</span>}<b>{track.title}</b></li>)}</ol></div><footer className="setlist-preview-actions"><button type="button" onClick={() => void saveImage()}>Descargar imagen</button><button type="button" onClick={() => void shareImage()}>Compartir imagen</button><button type="button" className="setlist-send" disabled={submissionBusy} onClick={() => void sendTop()}>{submitPhase === 'saving' ? 'Guardando…' : 'Guardar en la libreta'}</button></footer><button type="button" className="setlist-back" onClick={() => setPreview(false)}>← Volver a editar</button>
    </> : <>
      <p className="eyebrow">TOP 3 · PÁGINA {page}</p><h2>{selectionTitle}</h2><output className="setlist-count">{selectedIds.length} / {TOP_SIZE} seleccionadas</output>
      {availableTracks.length ? <><label className="setlist-search"><span>Buscar una canción</span><input type="search" value={trackSearch} onChange={(event) => setTrackSearch(event.target.value)} placeholder={activeTop === 'HOSHI' ? 'Busca dentro de HOSHI…' : 'Busca en toda la música de Bratty…'} autoComplete="off" /><small role="status" aria-live="polite">{visibleResultCount} {visibleResultCount === 1 ? 'resultado' : 'resultados'}</small></label>
        {visibleTrackGroups.length ? <div className="setlist-album-groups">{visibleTrackGroups.map((group) => {
          const open = expandedAlbums.includes(group.album) || Boolean(normalizedSearch && group.visibleTracks.length)
          const covers = getSetlistGroupCovers(group.album, group.tracks)
          const panelId = `album-${group.album.toLowerCase()}-tracks`
          return <section className={`setlist-album-group${open ? ' is-open' : ''}`} key={group.album}><button type="button" className="setlist-album-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => toggleAlbum(group.album)}><span className={`setlist-album-art${covers.length > 1 ? ` is-mosaic mosaic-${covers.length}` : ''}`}>{covers.length ? covers.map((track) => <img key={track.id} src={resolveSetlistCoverUrl(track.coverUrl)} alt="" />) : <i aria-hidden="true">✦</i>}</span><span className="setlist-album-meta"><b>{setlistAlbumLabels[group.album]}</b><small>{group.visibleTracks.length === group.tracks.length ? `${group.tracks.length} canciones` : `${group.visibleTracks.length} de ${group.tracks.length} canciones`}</small></span><i className="setlist-album-chevron" aria-hidden="true" /></button>{open && <div id={panelId} className="setlist-album-catalog">{group.visibleTracks.length ? <TrackCoverFlow tracks={group.visibleTracks} selectedIds={selectedIds} onToggle={toggleTrack} /> : <p className="setlist-album-empty">No hay canciones de esta colección que coincidan con la búsqueda.</p>}</div>}</section>
        })}</div> : <p className="setlist-search-empty">No encontramos canciones que coincidan con tu búsqueda.</p>}</> : <p className="setlist-empty">{activeTop === 'HOSHI' ? 'Todavía no hay canciones asociadas a la portada Hoshi.' : 'El equipo todavía no ha clasificado canciones en estos álbumes o colecciones.'}</p>}
      <footer><button type="button" className="setlist-cancel" onClick={() => setExpanded(false)}>Cancelar</button><button type="button" className="setlist-send" onClick={() => setPreview(true)} disabled={selectedIds.length !== TOP_SIZE}>Ver vista previa</button></footer>
    </>}</div></section>}
  </Layout>
}
