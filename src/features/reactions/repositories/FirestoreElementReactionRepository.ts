import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { firestore } from '../../../infrastructure/firebase/client'
import type { ElementReactionRepository, ElementReactions } from './ElementReactionRepository'

type ReactionRecord = { elementId: string; userId: string; createdAt: string }
const reactionId = (elementId: string, userId: string) => `${elementId}_${userId}`

export class FirestoreElementReactionRepository implements ElementReactionRepository {
  readonly usesFirebase = true
  private readonly database = firestore
  private ensureDatabase() { if (!this.database) throw new Error('Firebase no está configurado.') }

  subscribe(listener: (reactions: ElementReactions) => void, onError?: (error: unknown) => void) {
    this.ensureDatabase()
    return onSnapshot(collection(this.database!, 'elementReactions'), (snapshot) => {
      const reactions: ElementReactions = {}
      snapshot.docs.forEach((entry) => {
        const value = entry.data() as ReactionRecord
        reactions[value.elementId] = [...(reactions[value.elementId] ?? []), value.userId]
      })
      listener(reactions)
    }, (error) => onError?.(error))
  }

  async toggle(elementId: string, userId: string) {
    this.ensureDatabase()
    const reference = doc(this.database!, 'elementReactions', reactionId(elementId, userId))
    if ((await getDoc(reference)).exists()) await deleteDoc(reference)
    else await setDoc(reference, { elementId, userId, createdAt: new Date().toISOString() })
  }
}
