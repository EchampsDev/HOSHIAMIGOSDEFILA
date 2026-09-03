import type { NewsItem } from '../domain/types'
import { SocialIcon, type SocialBrand } from '../../../components/SocialIcon'

export function NewsSocialLinks({ item }: { item: NewsItem }) {
  const links = [['Instagram', item.instagramUrl], ['Facebook', item.facebookUrl], ['X', item.xUrl], ['TikTok', item.tiktokUrl]].filter((entry): entry is [string, string] => Boolean(entry[1]))
  if (!links.length && !item.externalUrl) return null
  return <nav className="news-social-links" aria-label={`Enlaces relacionados con ${item.title}`}>
    {links.map(([label, url]) => <a className="news-social-icon" key={`${label}-${url}`} href={url} target="_blank" rel="noreferrer" aria-label={`${label} de ${item.title}`} title={label}><SocialIcon brand={label as SocialBrand} /></a>)}
    {item.externalUrl && <a className="news-external-link" href={item.externalUrl} target="_blank" rel="noreferrer">{item.externalLabel?.trim() || 'Más información'} ↗</a>}
  </nav>
}
