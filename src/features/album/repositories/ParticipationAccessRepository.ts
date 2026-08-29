import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../../../infrastructure/firebase/client'

export type ParticipationAccessSettings = { isOpen: boolean }

const fallback: ParticipationAccessSettings = { isOpen: false }

function reference() {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return doc(firestore, 'siteConfig', 'participationAccess')
}

export const participationAccessRepository = {
  usesFirebase: isFirebaseConfigured,
  async save(settings: ParticipationAccessSettings) { await setDoc(reference(), settings) },
  subscribe(listener: (settings: ParticipationAccessSettings) => void, onError: (error: unknown) => void) {
    if (!isFirebaseConfigured) return undefined
    return onSnapshot(reference(), (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() as Partial<ParticipationAccessSettings> : fallback
      listener({ isOpen: Boolean(data.isOpen) })
    }, onError)
  },
}
