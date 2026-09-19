import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { firestore } from '../../../infrastructure/firebase/client'
import { createDefaultStickerCatalog, normalizeStickerCatalog, type StickerCatalog } from '../domain/catalog'
import type { StickerCatalogRepository } from './StickerCatalogRepository'

export class FirestoreStickerCatalogRepository implements StickerCatalogRepository {
  private readonly database = firestore
  private ensureDatabase() { if (!this.database) throw new Error('Firebase no está configurado.') }
  private reference() { this.ensureDatabase(); return doc(this.database!, 'stickerLibrary', 'catalog') }

  async getCatalog() {
    const snapshot = await getDoc(this.reference())
    return snapshot.exists() ? normalizeStickerCatalog(snapshot.data() as StickerCatalog) : createDefaultStickerCatalog()
  }

  async saveCatalog(catalog: StickerCatalog) {
    const normalized = normalizeStickerCatalog({ ...catalog, updatedAt: new Date().toISOString() })
    await setDoc(this.reference(), normalized)
    return normalized
  }

  subscribe(listener: () => void) { return onSnapshot(this.reference(), listener, listener) }
}
