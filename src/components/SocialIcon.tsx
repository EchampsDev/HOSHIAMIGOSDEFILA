export type SocialBrand = 'Instagram' | 'Facebook' | 'TikTok' | 'WhatsApp' | 'X'

export function SocialIcon({ brand }: { brand: SocialBrand }) {
  if (brand === 'Instagram') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" className="is-filled"/></svg>
  if (brand === 'Facebook') return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="is-filled" d="M14.1 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2H8.3v3H11v8h3.1Z"/></svg>
  if (brand === 'X') return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="is-filled" d="M4 4h4.7l4.1 5.5L17.7 4H20l-6.2 7.1L20.4 20h-4.7l-4.5-6-5.3 6H3.6l6.6-7.6L4 4Zm3.5 1.7L16.6 18h1.8L9.3 5.7H7.5Z"/></svg>
  if (brand === 'WhatsApp') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 11.8a8.3 8.3 0 0 1-12.3 7.3L4 20.2l1.1-4a8.3 8.3 0 1 1 15.3-4.4Z"/><path d="M9 7.8c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.4l.7 1.7c.1.3 0 .5-.2.7l-.6.7c-.2.2-.1.4 0 .6.7 1.2 1.6 2.1 2.8 2.7.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.8.9c.3.1.4.3.4.5 0 .3-.2 1.3-.8 1.8-.6.6-1.5.9-2.5.6-1-.3-2.8-1-4.5-2.5-1.3-1.2-2.3-2.7-2.6-3.8-.3-1.1.1-2 .5-2.4.4-.4.8-.6 1.3-.6"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path className="is-filled" d="M15 3c.3 2.2 1.6 3.5 3.8 3.7v3a8 8 0 0 1-3.8-1.1v6.2A6.2 6.2 0 1 1 9.7 8.7v3.2a3.2 3.2 0 1 0 2.2 3V3H15Z"/></svg>
}
