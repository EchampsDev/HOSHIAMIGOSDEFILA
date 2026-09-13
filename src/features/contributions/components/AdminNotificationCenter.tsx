import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGoogleSession } from '../../access/useGoogleSession'
import { PhotoArtwork } from '../../media/components/PhotoArtwork'
import type { ContributionRecord } from '../domain/types'
import { contributionRepository } from '../repositories'

const labels: Record<ContributionRecord['type'], string> = { PHOTO: 'Foto', POST_IT: 'Post-it', HANDWRITTEN_NOTE: 'Nota', DRAWING: 'Dibujo', STICKER: 'Sticker', TEXT: 'Texto', SETLIST: 'Top 3 musical', PLACEHOLDER: 'Elemento', OTHER: 'Aportación' }

export function AdminNotificationCenter() {
  const session = useGoogleSession()
  const [items, setItems] = useState<ContributionRecord[]>([])
  const [open, setOpen] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    return contributionRepository.subscribePending(setItems, () => setMessage('No fue posible consultar las aportaciones pendientes.'))
  }, [])
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  const moderate = async (item: ContributionRecord, decision: 'approve' | 'reject') => {
    if (!session.user) return
    setWorkingId(item.id); setMessage(null)
    try {
      if (decision === 'approve') await contributionRepository.approve(item.id, session.user.uid)
      else await contributionRepository.reject(item.id, session.user.uid)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible completar la moderación.') }
    finally { setWorkingId(null) }
  }

  const panel = <div className={`admin-notification-layer${open ? ' is-open' : ''}`} aria-hidden={!open}>
    <button type="button" className="admin-notification-backdrop" tabIndex={open ? 0 : -1} aria-label="Cerrar centro de notificaciones" onClick={() => setOpen(false)} />
    <aside id="admin-notification-center" className="admin-notification-panel" role="dialog" aria-modal="true" aria-label="Aportaciones pendientes">
      <header><div><p>MODERACIÓN · ENTRADA</p><h2>Aportaciones</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></header>
      <div className="admin-notification-summary"><strong>{items.length}</strong><span>{items.length === 1 ? 'pendiente por revisar' : 'pendientes por revisar'}</span></div>
      {message && <p className="admin-notification-message" role="alert">{message}</p>}
      <div className="admin-notification-list">
        {items.map((item) => <article key={item.id} className={reviewingId === item.id ? 'is-reviewing' : ''}>
          <div className="admin-notification-preview">{item.type === 'PHOTO' ? <PhotoArtwork media={item.media} alt="Fotografía pendiente" /> : <span>{item.type === 'SETLIST' ? '♫' : item.type === 'STICKER' ? '✦' : 'Aa'}</span>}</div>
          <div className="admin-notification-copy"><small>{labels[item.type]} · CARA {item.pageNumber} · {item.visibility === 'PRIVATE' ? 'PRIVADA' : 'PÚBLICA'}</small><strong>{item.author.displayName || 'Participante anónimo'}</strong><p>{item.type === 'SETLIST' ? item.setlist?.map((track) => track.title).join(' · ') : item.content || 'Sin texto adicional'}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</time></div>
          {reviewingId === item.id && <section className="admin-notification-review"><div className="admin-notification-review-media">{item.type === 'PHOTO' ? <PhotoArtwork media={item.media} alt="Fotografía enviada para revisión" /> : <span>{item.content || labels[item.type]}</span>}</div><dl><div><dt>Nombre</dt><dd>{item.author.displayName || 'Anónimo'}</dd></div><div><dt>Edad</dt><dd>{item.author.age ?? 'No indicada'}</dd></div><div><dt>Identificador</dt><dd>{item.participantId}</dd></div><div><dt>Destino</dt><dd>Cara {item.pageNumber}</dd></div><div><dt>Visibilidad</dt><dd>{item.visibility === 'PRIVATE' ? 'Privada' : 'Pública'}</dd></div><div><dt>Enviada</dt><dd>{new Date(item.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div></dl></section>}
          <div className="admin-notification-actions"><button type="button" className="is-review" onClick={() => setReviewingId((current) => current === item.id ? null : item.id)}>{reviewingId === item.id ? 'Cerrar revisión' : 'Revisar elemento'}</button>{reviewingId === item.id && <><button type="button" disabled={workingId === item.id} onClick={() => void moderate(item, 'approve')}>Aceptar publicación</button><button type="button" disabled={workingId === item.id} onClick={() => void moderate(item, 'reject')}>Rechazar</button></>}</div>
        </article>)}
        {!items.length && <p className="admin-notification-empty">Todo está al día.<br /><span>No hay aportaciones pendientes.</span></p>}
      </div>
    </aside>
  </div>

  return <>
    <button type="button" className="admin-notification-trigger" aria-label={`${items.length} aportaciones pendientes`} aria-expanded={open} aria-controls="admin-notification-center" onClick={() => setOpen(true)}>
      <span aria-hidden="true">✦</span><span className="admin-notification-label">Aportaciones</span>{items.length > 0 && <b>{items.length > 99 ? '99+' : items.length}</b>}
    </button>
    {createPortal(panel, document.body)}
  </>
}
