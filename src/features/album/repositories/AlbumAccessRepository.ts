import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../../../infrastructure/firebase/client'

export type AlbumAccessSettings = { isUnlocked: boolean }

const fallback: AlbumAccessSettings = { isUnlocked: false }
const reference = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return doc(firestore, 'siteConfig', 'albumAccess')
}

export const albumAccessRepository = {
  usesFirebase: isFirebaseConfigured,
  async save(settings: AlbumAccessSettings) { await setDoc(reference(), settings) },
  subscribe(listener: (settings: AlbumAccessSettings) => void, onError: (error: unknown) => void) {
    if (!isFirebaseConfigured) return undefined
    return onSnapshot(reference(), (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() as Partial<AlbumAccessSettings> : fallback
      listener({ isUnlocked: Boolean(data.isUnlocked) })
    }, onError)
  },
}
