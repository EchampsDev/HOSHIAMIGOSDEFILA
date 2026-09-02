import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { NewsCarousel } from '../features/news/components/NewsCarousel'
import { NewsSocialLinks } from '../features/news/components/NewsSocialLinks'
import { newsRepository } from '../features/news/repositories/NewsRepository'
import type { NewsItem } from '../features/news/domain/types'
import { formatNewsDate, newsDateValue } from '../features/news/domain/newsDate'

export function NewsDetailPage() {
  const { slug = '' } = useParams()
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => newsRepository.subscribePublished((publishedItems) => { setItems(publishedItems); setLoading(false) }, () => setLoading(false)), [])
  const orderedItems = [...items].sort((left, right) => Number(right.slug === slug) - Number(left.slug === slug))
  if (loading) return <Layout><section className="news-detail"><p>Cargando</p></section></Layout>
  if (!orderedItems.length) return <Layout><section className="news-detail"><p className="chapter-label">NOVEDADES DE BRATTY</p><h1>No hay novedades publicadas por el momento.</h1><Link to="/">Volver al inicio</Link></section></Layout>
  return <Layout><article className="news-detail"><header className="news-detail-topline"><Link className="news-back-link" to="/#novedades">← Leer más</Link><p className="news-published-count" aria-live="polite">{orderedItems.length} {orderedItems.length === 1 ? 'entrada publicada' : 'entradas publicadas'}</p></header><div className="news-detail-list">{orderedItems.map((entry, index) => <section className="news-detail-entry" key={entry.id}><NewsCarousel images={entry.images} fallbackAlt={entry.carouselAlt || entry.title} /><div className="news-detail-copy"><time dateTime={newsDateValue(entry.displayDate, entry.publishedAt)}>{formatNewsDate(entry.displayDate, entry.publishedAt)}</time>{index === 0 ? <h1>{entry.title}</h1> : <h2>{entry.title}</h2>}<p>{entry.description}</p><NewsSocialLinks item={entry} /></div></section>)}</div></article></Layout>
}
