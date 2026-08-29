import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import type { SetlistTrack } from '../data/localSetlistCatalog'

type StoredCatalog = { tracks: SetlistTrack[]; updatedAt: string }
const githubAssetsRoot = 'https://raw.githubusercontent.com/EchampsDev/HOSHIAMIGOSDEFILA/main/'

export function resolveSetlistCoverUrl(coverUrl?: string) {
  if (!coverUrl || /^https?:\/\//i.test(coverUrl) || coverUrl.startsWith('data:')) return coverUrl
  return `${githubAssetsRoot}${coverUrl.replace(/^\/+/, '')}`
}

const normalizeTracks = (tracks: SetlistTrack[]) => tracks.map((track) => ({ ...track, coverUrl: resolveSetlistCoverUrl(track.coverUrl) }))

const reference = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return doc(firestore, 'siteConfig', 'setlistCatalog')
}

export const setlistCatalogRepository = {
  usesFirebase: isFirebaseConfigured,
  async save(tracks: SetlistTrack[]) { await setDoc(reference(), { tracks: normalizeTracks(tracks), updatedAt: new Date().toISOString() } satisfies StoredCatalog) },
  subscribe(listener: (tracks: SetlistTrack[]) => void, onError: (error: unknown) => void) {
    if (!isFirebaseConfigured) return undefined
    return onSnapshot(reference(), (snapshot) => {
      if (!snapshot.exists()) return
      const data = snapshot.data() as Partial<StoredCatalog>
      listener(Array.isArray(data.tracks) ? normalizeTracks(data.tracks) : [])
    }, onError)
  },
}
