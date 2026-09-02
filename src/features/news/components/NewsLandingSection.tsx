import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { newsRepository } from '../repositories/NewsRepository'
import type { NewsItem } from '../domain/types'
import { NewsCarousel } from './NewsCarousel'
import { NewsSocialLinks } from './NewsSocialLinks'
import { formatNewsDate, newsDateValue } from '../domain/newsDate'
import { useGoogleSession } from '../../access/useGoogleSession'

function AdminIcon({ name }: { name: 'edit' | 'hide' | 'delete' }) {
  if (name === 'edit') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13.8 6.2 4 4"/></svg>
  if (name === 'hide') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.8 5.2A10.8 10.8 0 0 1 12 5c5.4 0 9 7 9 7a17 17 0 0 1-2.1 3M6.2 6.2C4.2 7.5 3 10 3 12c0 0 3.6 7 9 7 1 0 2-.2 2.8-.5"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>
}

export function NewsLandingSection() {
  const session = useGoogleSession()
  const [items, setItems] = useState<NewsItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  useEffect(() => newsRepository.subscribePublished(setItems, () => setError('No fue posible cargar las novedades.')), [])
  const adminAction = async (item: NewsItem, action: 'hide' | 'delete') => {
    if (!session.isAdmin || busyId) return
    if (action === 'delete' && !window.confirm(`¿Eliminar ${item.title}? Se archivará de forma recuperable.`)) return
    setBusyId(item.id); setAdminError(null)
    try {
      if (action === 'hide') await newsRepository.setVisibility(item, false)
      else await newsRepository.softDelete(item)
    } catch { setAdminError('No fue posible completar la acción administrativa.') }
    finally { setBusyId(null) }
  }
  return <section className="landing-chapter chapter-news" data-scroll-reveal aria-labelledby="news-section-title">
    <p className="chapter-label" id="news-section-title">04 — NOVEDADES DE BRATTY!!</p>
    {adminError && <p className="news-admin-inline-error" role="alert">{adminError}</p>}
    {error ? <p className="news-empty">Próximamente compartiremos nuevas historias y actualizaciones de BRATTY.</p> : items.length ? <><p className="news-published-count" aria-live="polite">{items.length} {items.length === 1 ? 'entrada publicada' : 'entradas publicadas'}</p><div className="news-feed">{items.map((item) => <article className="news-card" key={item.id}>
      <div className="news-card-media"><NewsCarousel images={item.images} fallbackAlt={item.carouselAlt || item.title} />
        {session.isAdmin && <nav className="news-card-admin" aria-label={`Administrar ${item.title}`}>
          <Link to={`/admin/noticias?edit=${encodeURIComponent(item.id)}`} aria-label={`Editar ${item.title}`} title="Editar"><AdminIcon name="edit" /></Link>
          <button type="button" disabled={busyId === item.id} onClick={() => void adminAction(item, 'hide')} aria-label={`Ocultar ${item.title}`} title="Ocultar"><AdminIcon name="hide" /></button>
          <button type="button" className="is-danger" disabled={busyId === item.id} onClick={() => void adminAction(item, 'delete')} aria-label={`Eliminar ${item.title}`} title="Eliminar"><AdminIcon name="delete" /></button>
        </nav>}
      </div>
      <div className="news-card-copy"><time dateTime={newsDateValue(item.displayDate, item.publishedAt)}>{formatNewsDate(item.displayDate, item.publishedAt)}</time><h2><Link to={`/novedades/${item.slug}`}>{item.title}</Link></h2><p>{item.description}</p><NewsSocialLinks item={item} /><Link className="news-read-link" to={`/novedades/${item.slug}`}>Leer más →</Link></div>
    </article>)}</div></> : <p className="news-empty">Próximamente compartiremos nuevas historias y actualizaciones de BRATTY.</p>}
  </section>
}
