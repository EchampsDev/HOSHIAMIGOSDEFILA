import { collection, doc, getDocs, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { firestore } from '../../../infrastructure/firebase/client'
import { createDefaultAlbum } from '../data/defaultAlbum'
import type { AlbumRepository } from './AlbumRepository'
import { pageCapacity, type AlbumDocument, type AlbumElement, type ScrapbookPage } from '../domain/types'

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export class FirestoreAlbumRepository implements AlbumRepository {
  private readonly database = firestore
  private mergePages(pages: ScrapbookPage[]) {
    const defaults = createDefaultAlbum()
    const byId = new Map(pages.map((page) => [page.id, page]))
    return { ...defaults, pages: defaults.pages.map((page) => copy(byId.get(page.id) ?? page)), updatedAt: new Date().toISOString() }
  }
  private ensureDatabase() { if (!this.database) throw new Error('Firebase no está configurado.') }
  async getAlbum(): Promise<AlbumDocument> {
    this.ensureDatabase()
    const snapshot = await getDocs(collection(this.database!, 'pages'))
    return this.mergePages(snapshot.docs.map((item) => item.data() as ScrapbookPage))
  }
  async getPage(pageId: string) { return (await this.getAlbum()).pages.find((page) => page.id === pageId) ?? null }
  async savePage(page: ScrapbookPage) { if (pageCapacity(page).used > 4) throw new Error('Una cara no puede contener más de cuatro elementos.'); this.ensureDatabase(); await setDoc(doc(this.database!, 'pages', page.id), copy(page)) }
  async saveElement(element: AlbumElement) {
    const page = await this.getPage(element.pageId)
    if (page) await this.savePage({ ...page, elements: page.elements.map((item) => item.id === element.id ? copy(element) : item), updatedAt: new Date().toISOString() })
  }
  async deleteElement(pageId: string, elementId: string) {
    const page = await this.getPage(pageId)
    if (page) await this.savePage({ ...page, elements: page.elements.filter((item) => item.id !== elementId), updatedAt: new Date().toISOString() })
  }
  subscribe(listener: (album: AlbumDocument) => void, onError?: (error: unknown) => void): Unsubscribe {
    this.ensureDatabase()
    return onSnapshot(collection(this.database!, 'pages'), (snapshot) => listener(this.mergePages(snapshot.docs.map((item) => item.data() as ScrapbookPage))), (error) => onError?.(error))
  }
}
