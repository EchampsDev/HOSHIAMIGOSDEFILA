export type SetlistTrack = { id: string; title: string; coverUrl?: string; createdAt: string }

const KEY = 'brattypolitan.setlist-catalog.v1'
const copy = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T

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
