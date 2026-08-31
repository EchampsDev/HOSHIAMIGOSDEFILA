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
  const [item, setItem] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; void newsRepository.findPublishedBySlug(slug).then((result) => { if (active) setItem(result) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [slug])
  if (loading) return <Layout><section className="news-detail"><p>Preparando novedad…</p></section></Layout>
  if (!item) return <Layout><section className="news-detail"><p className="chapter-label">NOVEDADES DE BRATTY</p><h1>Esta novedad no está disponible.</h1><Link to="/">Volver al inicio</Link></section></Layout>
  return <Layout><article className="news-detail"><Link className="news-back-link" to="/#novedades">← Todas las novedades</Link><NewsCarousel images={item.images} fallbackAlt={item.carouselAlt || item.title} /><div className="news-detail-copy"><time dateTime={newsDateValue(item.displayDate, item.publishedAt)}>{formatNewsDate(item.displayDate, item.publishedAt)}</time><h1>{item.title}</h1><p>{item.description}</p><NewsSocialLinks item={item} /></div></article></Layout>
}
