import type { ModerationEvent, RegistrationNotification } from './useAdminActivity'

const eventLabel: Record<ModerationEvent['action'], string> = { APPROVED: 'Aprobada', REJECTED: 'Rechazada', DELETED: 'Eliminada' }
const dateLabel = (value: string) => new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

export function RegistrationFeed({ items, history, onRead }: { items: RegistrationNotification[]; history: boolean; onRead: (item: RegistrationNotification) => void }) {
  const visible = history ? items : items.filter((item) => !item.read)
  if (!visible.length) return <p className="admin-notification-empty">{history ? 'Todavía no hay registros en el historial.' : 'No hay registros nuevos.'}</p>
  return <div className="admin-notification-list admin-activity-list">
    {visible.map((item) => <article key={item.id} className={item.read ? 'is-read' : ''}>
      <div className="admin-activity-icon" aria-hidden="true">{item.source === 'BRATTY_INVITATION' ? '✦' : '@'}</div>
      <div className="admin-notification-copy">
        <small>{item.source === 'BRATTY_INVITATION' ? 'INVITACIÓN ESPECIAL · BRATTY' : 'NUEVO REGISTRO'}</small>
        <strong>{item.displayName || 'Usuario sin nombre'}</strong>
        <p>{item.email || 'Correo no disponible'}</p>
        <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
      </div>
      {!item.read && <div className="admin-notification-actions"><button type="button" className="is-review" onClick={() => onRead(item)}>Marcar como leída</button></div>}
    </article>)}
  </div>
}

export function ModerationHistory({ items }: { items: ModerationEvent[] }) {
  if (!items.length) return <p className="admin-notification-empty">El historial comenzará con las próximas moderaciones.</p>
  return <div className="admin-notification-list admin-activity-list">
    {items.map((item) => <article key={item.id}>
      <div className="admin-activity-icon" aria-hidden="true">{item.action === 'APPROVED' ? '✓' : item.action === 'REJECTED' ? '×' : '−'}</div>
      <div className="admin-notification-copy">
        <small>{eventLabel[item.action]} · {item.contributionType}{item.pageNumber ? ' · CARA ' + item.pageNumber : ''}</small>
        <strong>{item.authorName || 'Participante anónimo'}</strong>
        <p>Por {item.moderatorName || item.moderatorEmail || item.moderatorUid}</p>
        <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
      </div>
    </article>)}
  </div>
}
