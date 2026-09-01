import type { NewsItem } from '../domain/types'

function SocialIcon({ brand }: { brand: string }) {
  if (brand === 'Instagram') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" className="is-filled"/></svg>
  if (brand === 'Facebook') return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="is-filled" d="M14.1 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2H8.3v3H11v8h3.1Z"/></svg>
  if (brand === 'X') return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="is-filled" d="M4 4h4.7l4.1 5.5L17.7 4H20l-6.2 7.1L20.4 20h-4.7l-4.5-6-5.3 6H3.6l6.6-7.6L4 4Zm3.5 1.7L16.6 18h1.8L9.3 5.7H7.5Z"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="is-filled" d="M15 3c.3 2.2 1.6 3.5 3.8 3.7v3a8 8 0 0 1-3.8-1.1v6.2A6.2 6.2 0 1 1 9.7 8.7v3.2a3.2 3.2 0 1 0 2.2 3V3H15Z"/></svg>
}

export function NewsSocialLinks({ item }: { item: NewsItem }) {
  const links = [['Instagram', item.instagramUrl], ['Facebook', item.facebookUrl], ['X', item.xUrl], ['TikTok', item.tiktokUrl]].filter((entry): entry is [string, string] => Boolean(entry[1]))
  if (!links.length && !item.externalUrl) return null
  return <nav className="news-social-links" aria-label={`Enlaces relacionados con ${item.title}`}>
    {links.map(([label, url]) => <a className="news-social-icon" key={`${label}-${url}`} href={url} target="_blank" rel="noreferrer" aria-label={`${label} de ${item.title}`} title={label}><SocialIcon brand={label} /></a>)}
    {item.externalUrl && <a className="news-external-link" href={item.externalUrl} target="_blank" rel="noreferrer">{item.externalLabel?.trim() || 'Más información'} ↗</a>}
  </nav>
}
