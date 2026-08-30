import type { NewsItem } from '../domain/types'

export function NewsSocialLinks({ item }: { item: NewsItem }) {
  const links = [['Instagram', item.instagramUrl], ['Facebook', item.facebookUrl], ['X', item.xUrl], ['TikTok', item.tiktokUrl]].filter((entry): entry is [string, string] => Boolean(entry[1]))
  if (!links.length) return null
  return <nav className="news-social-links" aria-label={`Redes relacionadas con ${item.title}`}>{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer">{label} ↗</a>)}</nav>
}
