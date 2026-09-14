export const setlistAlbumOrder = ['DELUSION', 'TRES', 'TDBN', 'HOSHI', 'SINGLES', 'COLLABORATIONS'] as const
export type SetlistAlbum = typeof setlistAlbumOrder[number]
export type SetlistTrack = { id: string; title: string; coverUrl?: string; coverObjectKey?: string; album?: SetlistAlbum | 'OTHER'; createdAt: string }

export const setlistAlbumLabels: Record<SetlistAlbum, string> = {
  DELUSION: 'Delusion',
  TRES: 'TRES',
  TDBN: 'tdbn',
  HOSHI: 'HOSHI',
  SINGLES: 'Sencillos',
  COLLABORATIONS: 'Colaboraciones',
}

export const dynamicSetlistCollections = new Set<SetlistAlbum>(['SINGLES', 'COLLABORATIONS'])

const KEY = 'brattypolitan.setlist-catalog.v1'
const copy = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T
const legacyHoshiTitles = new Set([
  'delusion', 'hoshi', 'ya no es lo mismo', 'un nuevo disco', 'radio', 'la ultima vez', 'agosto', 'nada que decir',
  'estos dias', 'asi tq recordar', 'que yo a ti', 'esta ciudad', 'que sera de mi', 'nunca supe', 'epilogo',
])
const normalizeTitle = (title: string) => title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function getSetlistAlbum(track: SetlistTrack): SetlistAlbum | 'OTHER' {
  if (track.album === 'SINGLES' || track.album === 'COLLABORATIONS') return track.album
  const coverName = track.coverUrl?.split(/[/?#]/).filter(Boolean).at(-1)?.replace(/\.[^.]+$/, '').toUpperCase()
  if (coverName === 'DELUSION' || coverName === 'TRES' || coverName === 'TDBN' || coverName === 'HOSHI') return coverName
  if (track.album && track.album !== 'OTHER') return track.album
  return legacyHoshiTitles.has(normalizeTitle(track.title)) ? 'HOSHI' : 'OTHER'
}

export function getSetlistGroupCovers(album: SetlistAlbum, tracks: SetlistTrack[]) {
  const withCover = tracks.filter((track) => Boolean(track.coverUrl))
  if (!dynamicSetlistCollections.has(album)) return withCover.slice(0, 1)
  return withCover.sort((first, second) => {
    const firstTime = Date.parse(first.createdAt)
    const secondTime = Date.parse(second.createdAt)
    return (Number.isFinite(secondTime) ? secondTime : 0) - (Number.isFinite(firstTime) ? firstTime : 0)
  }).slice(0, 4)
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
