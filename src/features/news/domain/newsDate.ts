export function newsDateValue(displayDate?: string, publishedAt?: string) {
  return displayDate || publishedAt || ''
}

export function formatNewsDate(displayDate?: string, publishedAt?: string) {
  const value = newsDateValue(displayDate, publishedAt)
  if (!value) return ''
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  return new Date(normalized).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}
