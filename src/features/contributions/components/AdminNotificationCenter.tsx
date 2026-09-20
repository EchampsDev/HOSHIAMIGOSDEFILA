import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGoogleSession } from '../../access/useGoogleSession'
import { AlbumElementPreview } from '../../album/components/AlbumElementPreview'
import { useAlbum } from '../../album/hooks/useAlbum'
import { useParticipationAccess } from '../../album/hooks/useParticipationAccess'
import { availableSlots, pendingCountsFromItems, recommendedPageNumber } from '../domain/pageAvailability'
import type { AlbumElement } from '../../album/domain/types'
import { StickerArtwork } from '../../stickers/components/StickerArtwork'
import type { CommunitySticker } from '../../stickers/domain/types'
import { useStickerLibrary } from '../../stickers/hooks/useStickerLibrary'
import type { ContributionRecord } from '../domain/types'
import { contributionRepository } from '../repositories'
import { ModerationHistory, RegistrationFeed } from './AdminActivityFeed'
import { recordModerationEvent, useAdminActivity } from './useAdminActivity'

const labels: Record<ContributionRecord['type'], string> = { PHOTO: 'Foto', POST_IT: 'Post-it', HANDWRITTEN_NOTE: 'Nota', DRAWING: 'Dibujo', STICKER: 'Sticker', TEXT: 'Texto', SETLIST: 'Top 3 musical', PLACEHOLDER: 'Elemento', OTHER: 'Aportación' }
const contributionKey = (id: string) => `contribution:${id}`
const stickerKey = (id: string) => `sticker:${id}`
const shortDate = (value: string) => new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
const longDate = (value: string) => new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
const contributionPreview = (item: ContributionRecord): AlbumElement => ({
  id: item.id,
  pageId: `page-${item.pageNumber}`,
  type: item.type,
  author: item.author,
  content: item.content,
  media: item.media,
  setlist: item.setlist,
  styleVariant: item.styleVariant,
  stickerId: item.stickerId,
  visibility: item.visibility,
  layout: { x: 0, y: 0, width: 1, height: 1, rotation: 0, zIndex: 1, locked: true, hidden: false },
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
})

export function AdminNotificationCenter() {
  const session = useGoogleSession()
  const stickerLibrary = useStickerLibrary(true)
  const album = useAlbum()
  const participation = useParticipationAccess()
  const [items, setItems] = useState<ContributionRecord[]>([])
  const [open, setOpen] = useState(false)
  const [reviewingKey, setReviewingKey] = useState<string | null>(null)
  const [workingKey, setWorkingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [moveTargets, setMoveTargets] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<'contributions' | 'notifications'>('contributions')
  const [historyMode, setHistoryMode] = useState(false)
  const activity = useAdminActivity(session.isAdmin)
  const totalPending = items.length + stickerLibrary.pending.length
  const combinedBadge = totalPending + activity.unreadCount
  const pendingForReview = pendingCountsFromItems(items)
  const suggestPage = (item: ContributionRecord) => {
    const pages = album.album?.pages ?? []
    return recommendedPageNumber(pages, pendingForReview, item.type, item.pageNumber) ?? item.pageNumber
  }

  const rememberModeration = (input: { targetId: string; targetKind: 'CONTRIBUTION' | 'STICKER'; contributionType: string; action: 'APPROVED' | 'REJECTED' | 'DELETED'; authorName: string; pageNumber?: number }) => {
    if (!session.user) return
    void recordModerationEvent({ ...input, moderatorUid: session.user.uid, moderatorName: session.user.displayName ?? 'Administrador', moderatorEmail: session.user.email ?? '' })
      .catch(() => setMessage('La moderación se completó, pero no fue posible añadirla al historial.'))
  }

  useEffect(() => contributionRepository.subscribePending(setItems, () => setMessage('No fue posible consultar las aportaciones pendientes.')), [])
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  const moderateContribution = async (item: ContributionRecord, decision: 'approve' | 'reject') => {
    if (!session.user) return
    const key = contributionKey(item.id)
    setWorkingKey(key); setMessage(null)
    try {
      if (decision === 'approve') await contributionRepository.approve(item.id, session.user.uid)
      else await contributionRepository.reject(item.id, session.user.uid)
      rememberModeration({ targetId: item.id, targetKind: 'CONTRIBUTION', contributionType: labels[item.type], action: decision === 'approve' ? 'APPROVED' : 'REJECTED', authorName: item.author.displayName ?? 'Participante anónimo', pageNumber: item.pageNumber })
      setReviewingKey(null)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible completar la moderación.') }
    finally { setWorkingKey(null) }
  }

  const moderateSticker = async (sticker: CommunitySticker, decision: 'approve' | 'reject') => {
    const key = stickerKey(sticker.id)
    setWorkingKey(key); setMessage(null)
    try {
      await stickerLibrary.updateStatus(sticker.id, decision === 'approve' ? 'APPROVED' : 'REJECTED')
      rememberModeration({ targetId: sticker.id, targetKind: 'STICKER', contributionType: 'Sticker', action: decision === 'approve' ? 'APPROVED' : 'REJECTED', authorName: sticker.authorName || 'Autor anónimo' })
      setReviewingKey(null)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible moderar el sticker.') }
    finally { setWorkingKey(null) }
  }
  const moveContribution = async (item: ContributionRecord) => {
    if (!session.user || workingKey) return
    const target = moveTargets[item.id] ?? suggestPage(item)
    if (target === item.pageNumber) { setMessage('Elige otra cara para mover la aportación.'); return }
    setWorkingKey(contributionKey(item.id)); setMessage(null)
    try { await contributionRepository.movePending(item.id, target, session.user.uid); setMoveTargets((current) => { const next = { ...current }; delete next[item.id]; return next }) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible mover la aportación.') }
    finally { setWorkingKey(null) }
  }
  const deleteContribution = async (item: ContributionRecord) => {
    if (!session.isAdmin || !session.user || workingKey || !window.confirm('¿Eliminar esta aportación pendiente? Quedará en la papelera administrativa.')) return
    setWorkingKey(contributionKey(item.id)); setMessage(null)
    try { await contributionRepository.deletePending(item.id, session.user.uid); rememberModeration({ targetId: item.id, targetKind: 'CONTRIBUTION', contributionType: labels[item.type], action: 'DELETED', authorName: item.author.displayName ?? 'Participante anónimo', pageNumber: item.pageNumber }); setReviewingKey(null) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible eliminar la aportación.') }
    finally { setWorkingKey(null) }
  }
  const reconcileAvailability = async () => {
    if (!session.isAdmin || participation.isOpen || participation.error || workingKey || !window.confirm('Se reconstruirán únicamente los conteos de caras a partir de las aportaciones pendientes. Confirma que la participación permanece cerrada.')) return
    setWorkingKey('availability'); setMessage(null)
    try { await contributionRepository.reconcileAvailability(); setMessage('Disponibilidad actualizada a partir de las solicitudes pendientes.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible conciliar los cupos.') }
    finally { setWorkingKey(null) }
  }

  const panel = <div className={`admin-notification-layer${open ? ' is-open' : ''}`} aria-hidden={!open}>
    <button type="button" className="admin-notification-backdrop" tabIndex={open ? 0 : -1} aria-label="Cerrar centro de notificaciones" onClick={() => setOpen(false)} />
    <aside id="admin-notification-center" className="admin-notification-panel" role="dialog" aria-modal="true" aria-label="Solicitudes pendientes">
      <header><div><p>MODERACIÓN · ENTRADA</p><h2>{activeTab === 'contributions' ? 'Aportaciones' : 'Notificaciones'}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></header>
      <nav className="admin-notification-tabs" aria-label="Secciones del centro de administración">
        <button type="button" className={activeTab === 'contributions' ? 'is-active' : ''} onClick={() => { setActiveTab('contributions'); setHistoryMode(false) }}>Aportaciones {totalPending > 0 && <b>{totalPending}</b>}</button>
        <button type="button" className={activeTab === 'notifications' ? 'is-active' : ''} onClick={() => { setActiveTab('notifications'); setHistoryMode(false) }}>Notificaciones {activity.unreadCount > 0 && <b>{activity.unreadCount}</b>}</button>
        <button type="button" className={historyMode ? 'admin-history-toggle is-active' : 'admin-history-toggle'} onClick={() => setHistoryMode((current) => !current)} aria-label={historyMode ? 'Volver a pendientes' : 'Ver historial reciente'} title={historyMode ? 'Volver' : 'Últimos 20'}>◷</button>
      </nav>
      {activeTab === 'contributions' ? historyMode ? <ModerationHistory items={activity.moderations} /> : <>
      <div className="admin-notification-summary"><strong>{totalPending}</strong><span>{totalPending === 1 ? 'pendiente por revisar' : 'pendientes por revisar'}</span></div>
      <details className={`admin-notification-maintenance${participation.isOpen ? ' is-locked' : ''}`}>
        <summary>Revisar espacios disponibles</summary>
        <div><p>Úsalo solamente si el número de lugares disponibles parece incorrecto. Recalcula los espacios reservados por solicitudes pendientes; no elimina ni modifica recuerdos.</p><button type="button" disabled={participation.isOpen || Boolean(participation.error) || Boolean(workingKey)} onClick={() => void reconcileAvailability()}>Actualizar conteo</button><small>{participation.isOpen ? 'Para habilitar esta acción, pausa temporalmente las aportaciones desde la pantalla principal.' : 'Las aportaciones están pausadas. Puedes actualizar el conteo con seguridad.'}</small></div>
      </details>
      {(message || stickerLibrary.error) && <p className="admin-notification-message" role="alert">{message || stickerLibrary.error}</p>}
      <div className="admin-notification-list">
        {stickerLibrary.pending.map((sticker) => {
          const key = stickerKey(sticker.id)
          const reviewing = reviewingKey === key
          return <article key={key} className={reviewing ? 'is-reviewing' : ''}>
            <div className="admin-notification-preview is-sticker"><StickerArtwork stickerId={sticker.id} alt={sticker.title} /></div>
            <div className="admin-notification-copy"><small>STICKER COMUNITARIO · PÚBLICO AL APROBAR</small><strong>{sticker.title}</strong><p>{sticker.authorName || 'Autor anónimo'} · {Math.ceil(sticker.fileSize / 1024)} KB</p><time dateTime={sticker.createdAt}>{shortDate(sticker.createdAt)}</time></div>
            {reviewing && <section className="admin-notification-review"><div className="admin-notification-review-media"><StickerArtwork stickerId={sticker.id} alt={`Sticker ${sticker.title} enviado para revisión`} /></div><dl><div><dt>Título</dt><dd>{sticker.title}</dd></div><div><dt>Autor</dt><dd>{sticker.authorName || 'Anónimo'}</dd></div><div><dt>Dimensiones</dt><dd>{sticker.originalWidth} × {sticker.originalHeight} px</dd></div><div><dt>Tamaño</dt><dd>{(sticker.fileSize / 1024 / 1024).toFixed(2)} MB</dd></div><div><dt>Identificador</dt><dd>{sticker.id}</dd></div><div><dt>Enviado</dt><dd>{longDate(sticker.createdAt)}</dd></div></dl></section>}
            <div className="admin-notification-actions"><button type="button" className="is-review" onClick={() => setReviewingKey((current) => current === key ? null : key)}>{reviewing ? 'Cerrar revisión' : 'Revisar elemento'}</button>{reviewing && <><button type="button" disabled={workingKey === key} onClick={() => void moderateSticker(sticker, 'approve')}>Aceptar publicación</button><button type="button" disabled={workingKey === key} onClick={() => void moderateSticker(sticker, 'reject')}>Rechazar</button></>}</div>
          </article>
        })}
        {items.map((item) => {
          const key = contributionKey(item.id)
          const reviewing = reviewingKey === key
          const preview = contributionPreview(item)
          return <article key={key} className={reviewing ? 'is-reviewing' : ''}>
            <div className={`admin-notification-preview is-${item.type.toLowerCase()}`}><AlbumElementPreview element={preview} /></div>
            <div className="admin-notification-copy"><small>{labels[item.type]} · CARA {item.pageNumber} · {item.visibility === 'PRIVATE' ? 'PRIVADA' : 'PÚBLICA'}</small><strong>{item.author.displayName || 'Participante anónimo'}</strong><p>{item.type === 'SETLIST' ? item.setlist?.map((track) => track.title).join(' · ') : item.content || 'Sin texto adicional'}</p><time dateTime={item.createdAt}>{shortDate(item.createdAt)}</time></div>
            {reviewing && <section className="admin-notification-review"><div className="admin-notification-review-media"><AlbumElementPreview element={preview} /></div><dl><div><dt>Nombre</dt><dd>{item.author.displayName || 'Anónimo'}</dd></div><div><dt>Edad</dt><dd>{item.author.age ?? 'No indicada'}</dd></div><div><dt>Identificador</dt><dd>{item.participantId}</dd></div><div><dt>Destino</dt><dd>Cara {item.pageNumber}</dd></div><div><dt>Visibilidad</dt><dd>{item.visibility === 'PRIVATE' ? 'Privada' : 'Pública'}</dd></div><div><dt>Enviada</dt><dd>{longDate(item.createdAt)}</dd></div></dl></section>}
            {reviewing && <div className="admin-notification-move"><label>Destino sugerido<select value={moveTargets[item.id] ?? suggestPage(item)} onChange={(event) => setMoveTargets((current) => ({ ...current, [item.id]: Number(event.target.value) }))}>{album.album?.pages.filter((page) => { return page.pageNumber === item.pageNumber || availableSlots(page, pendingForReview, item.type) > 0 }).map((page) => <option key={page.id} value={page.pageNumber}>Cara {page.pageNumber}{page.pageNumber === suggestPage(item) ? ' · recomendada' : ''}</option>)}</select></label><button type="button" disabled={Boolean(workingKey) || (moveTargets[item.id] ?? suggestPage(item)) === item.pageNumber} onClick={() => void moveContribution(item)}>Mover a otra cara</button></div>}
            <div className="admin-notification-actions"><button type="button" className="is-review" onClick={() => setReviewingKey((current) => current === key ? null : key)}>{reviewing ? 'Cerrar revisión' : 'Revisar elemento'}</button>{reviewing && <><button type="button" disabled={workingKey === key} onClick={() => void moderateContribution(item, 'approve')}>Aceptar publicación</button><button type="button" disabled={workingKey === key} onClick={() => void moderateContribution(item, 'reject')}>Rechazar</button><button type="button" className="is-danger" disabled={Boolean(workingKey)} onClick={() => void deleteContribution(item)}>Eliminar aportación</button></>}</div>
          </article>
        })}
        {!totalPending && <p className="admin-notification-empty">Todo está al día.<br /><span>No hay aportaciones ni stickers pendientes.</span></p>}
      </div>
      </> : <RegistrationFeed items={activity.notifications} history={historyMode} onRead={(item) => void activity.markRead(item, session.user?.uid ?? '')} />}
      {activity.error && activeTab === 'notifications' && <p className="admin-notification-message" role="alert">{activity.error}</p>}
    </aside>
  </div>

  return <>
    <button type="button" className="admin-notification-trigger" aria-label={`${totalPending} aportaciones pendientes y ${activity.unreadCount} notificaciones nuevas`} aria-expanded={open} aria-controls="admin-notification-center" onClick={() => setOpen(true)}>
      <span aria-hidden="true">✦</span><span className="admin-notification-label">Aportaciones</span>{combinedBadge > 0 && <b>{combinedBadge > 99 ? '99+' : combinedBadge}</b>}
    </button>
    {createPortal(panel, document.body)}
  </>
}
