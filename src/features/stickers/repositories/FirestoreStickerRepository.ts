import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { firebaseAuth, firestore } from '../../../infrastructure/firebase/client'
import { demoStickers } from '../data/demoStickers'
import type { CommunitySticker, NewCommunitySticker } from '../domain/types'
import type { StickerRepository } from './StickerRepository'

const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const fromSnapshot = (snapshot: { id: string; data(): unknown }): CommunitySticker => ({ id: snapshot.id, ...(snapshot.data() as Omit<CommunitySticker, 'id'>) })

export class FirestoreStickerRepository implements StickerRepository {
  private readonly database = firestore
  private ensureDatabase() { if (!this.database) throw new Error('Firebase no está configurado.') }

  async getApprovedStickers() {
    this.ensureDatabase()
    const snapshot = await getDocs(query(collection(this.database!, 'communityStickers'), where('publicApproved', '==', true)))
    return [...demoStickers, ...snapshot.docs.map(fromSnapshot)].sort((first, second) => second.createdAt.localeCompare(first.createdAt))
  }

  async getPendingStickers() {
    this.ensureDatabase()
    const snapshot = await getDocs(query(collection(this.database!, 'communityStickers'), where('status', '==', 'PENDING')))
    return snapshot.docs.map(fromSnapshot).sort((first, second) => second.createdAt.localeCompare(first.createdAt))
  }

  async getSticker(id: string) {
    const demo = demoStickers.find((sticker) => sticker.id === id)
    if (demo) return demo
    this.ensureDatabase()
    const snapshot = await getDoc(doc(this.database!, 'communityStickers', id))
    return snapshot.exists() ? fromSnapshot(snapshot) : null
  }

  async createSticker(input: NewCommunitySticker) {
    this.ensureDatabase()
    const user = firebaseAuth?.currentUser
    if (!user) throw new Error('Inicia sesión con Google para enviar un sticker a revisión.')
    const now = new Date().toISOString()
    const id = input.id ?? crypto.randomUUID()
    const sticker: CommunitySticker = clean({ ...input, id, ownerUid: user.uid, status: 'PENDING', publicApproved: false, createdAt: now, updatedAt: now })
    await setDoc(doc(this.database!, 'communityStickers', id), sticker)
    return sticker
  }

  async updateSticker(id: string, patch: Partial<Omit<CommunitySticker, 'id' | 'createdAt'>>) {
    const existing = await this.getSticker(id)
    if (!existing || demoStickers.some((demo) => demo.id === id)) throw new Error('Este sticker base no se puede modificar.')
    const status = patch.status ?? existing.status
    const visibility = patch.visibility ?? existing.visibility
    const updated = clean({ ...existing, ...patch, publicApproved: status === 'APPROVED' && visibility === 'PUBLIC', updatedAt: new Date().toISOString() })
    await updateDoc(doc(this.database!, 'communityStickers', id), clean({
      title: updated.title,
      authorName: updated.authorName,
      description: updated.description,
      visibility: updated.visibility,
      displayWidth: updated.displayWidth,
      displayHeight: updated.displayHeight,
      status: updated.status,
      publicApproved: updated.publicApproved,
      updatedAt: updated.updatedAt,
    }))
    return updated
  }

  async deleteSticker(id: string) {
    this.ensureDatabase()
    if (demoStickers.some((demo) => demo.id === id)) throw new Error('Este sticker base no se puede eliminar.')
    await deleteDoc(doc(this.database!, 'communityStickers', id))
  }

  subscribe(listener: () => void, includePending = false) {
    this.ensureDatabase()
    const unsubscribers = [onSnapshot(query(collection(this.database!, 'communityStickers'), where('publicApproved', '==', true)), listener)]
    if (includePending) unsubscribers.push(onSnapshot(query(collection(this.database!, 'communityStickers'), where('status', '==', 'PENDING')), listener))
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}
