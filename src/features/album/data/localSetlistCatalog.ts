export const setlistAlbumOrder = ['DELUSION', 'TRES', 'TDBN', 'HOSHI'] as const
export type SetlistAlbum = typeof setlistAlbumOrder[number]
export type SetlistTrack = { id: string; title: string; coverUrl?: string; album?: SetlistAlbum | 'OTHER'; createdAt: string }

export const setlistAlbumLabels: Record<SetlistAlbum, string> = {
  DELUSION: 'Delusion',
  TRES: 'TRES',
  TDBN: 'tdbn',
  HOSHI: 'HOSHI',
}

const KEY = 'brattypolitan.setlist-catalog.v1'
const copy = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T
const legacyHoshiTitles = new Set([
  'delusion', 'hoshi', 'ya no es lo mismo', 'un nuevo disco', 'radio', 'la ultima vez', 'agosto', 'nada que decir',
  'estos dias', 'asi tq recordar', 'que yo a ti', 'esta ciudad', 'que sera de mi', 'nunca supe', 'epilogo',
])
const normalizeTitle = (title: string) => title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function getSetlistAlbum(track: SetlistTrack): SetlistAlbum | 'OTHER' {
  const coverName = track.coverUrl?.split(/[/?#]/).filter(Boolean).at(-1)?.replace(/\.[^.]+$/, '').toUpperCase()
  if (coverName === 'DELUSION' || coverName === 'TRES' || coverName === 'TDBN' || coverName === 'HOSHI') return coverName
  if (track.album && track.album !== 'OTHER') return track.album
  return legacyHoshiTitles.has(normalizeTitle(track.title)) ? 'HOSHI' : 'OTHER'
}

export function isHoshiTrack(track: SetlistTrack) {
  if (track.coverUrl) return getSetlistAlbum(track) === 'HOSHI'
  if (track.album) return track.album === 'HOSHI'
  return legacyHoshiTitles.has(normalizeTitle(track.title))
}

export function readSetlistTracks(): SetlistTrack[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? copy(value) : []
  } catch { return [] }
}

export function writeSetlistTracks(tracks: SetlistTrack[]) {
  window.localStorage.setItem(KEY, JSON.stringify(tracks))
  window.dispatchEvent(new Event('brattypolitan-setlist-change'))
}

export function createSetlistTrack(title = 'Track sin título'): SetlistTrack {
  return { id: `track-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`, title, createdAt: new Date().toISOString() }
}
