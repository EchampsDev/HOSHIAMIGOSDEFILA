import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import type { ConstellationConnection } from '../../landing/data/constellationConnections'
import type { ConstellationPoint } from '../../landing/data/constellationPoints'
import type { ConstellationScene } from '../../landing/data/constellationScene'

export type ConstellationProgress = {
  version: 1
  savedAt: string
  points: ConstellationPoint[]
  connections: ConstellationConnection[]
  scene: ConstellationScene
  referenceImageUrl?: string
}

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const reference = () => {
  if (!firestore) throw new Error('Firebase no está configurado.')
  return doc(firestore, 'siteConfig', 'constellation')
}

export const constellationRepository = {
  usesFirebase: isFirebaseConfigured,
  async get() {
    const snapshot = await getDoc(reference())
    return snapshot.exists() ? copy(snapshot.data() as ConstellationProgress) : null
  },
  async save(progress: ConstellationProgress) { await setDoc(reference(), copy(progress)) },
  subscribe(listener: (progress: ConstellationProgress | null) => void, onError: (error: unknown) => void) {
    return onSnapshot(reference() as never, (snapshot: { exists: () => boolean; data: () => unknown }) => listener(snapshot.exists() ? copy(snapshot.data() as ConstellationProgress) : null), onError)
  },
}
