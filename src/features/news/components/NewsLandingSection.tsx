import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { newsRepository } from '../repositories/NewsRepository'
import type { NewsItem } from '../domain/types'
import { NewsCarousel } from './NewsCarousel'
import { NewsSocialLinks } from './NewsSocialLinks'

const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

export function NewsLandingSection() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => newsRepository.subscribePublished(setItems, () => setError('No fue posible cargar las novedades.')), [])
  return <section className="landing-chapter chapter-news" data-scroll-reveal aria-labelledby="news-section-title">
    <p className="chapter-label" id="news-section-title">04 — NOVEDADES DE BRATTY!!</p>
    {error ? <p className="news-empty">Próximamente compartiremos nuevas historias y actualizaciones de BRATTY.</p> : items.length ? <div className="news-feed">{items.map((item) => <article className="news-card" key={item.id}>
      <NewsCarousel images={item.images} fallbackAlt={item.carouselAlt || item.title} />
      <div className="news-card-copy"><time dateTime={item.publishedAt}>{dateLabel(item.publishedAt)}</time><h2><Link to={`/novedades/${item.slug}`}>{item.title}</Link></h2><p>{item.description}</p><NewsSocialLinks item={item} /><Link className="news-read-link" to={`/novedades/${item.slug}`}>Leer novedad →</Link></div>
    </article>)}</div> : <p className="news-empty">Próximamente compartiremos nuevas historias y actualizaciones de BRATTY.</p>}
  </section>
}
