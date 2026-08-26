import { createDefaultAlbum } from '../data/defaultAlbum'
import type { AlbumRepository } from './AlbumRepository'
import type { AlbumDocument, AlbumElement, ScrapbookPage } from '../domain/types'

const STORAGE_KEY = 'brattypolitan.scrapbook.v1'
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const normalize = (album: AlbumDocument): AlbumDocument => ({ ...album, pages: album.pages.map((page) => ({ ...page, elements: page.elements.map((element) => ({ ...element, author: element.author ?? { participantId: 'legacy-unassigned' } })) })) })

export class LocalAlbumRepository implements AlbumRepository {
  private async read(): Promise<AlbumDocument> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return createDefaultAlbum()
      const album = JSON.parse(raw) as AlbumDocument
      return album.schemaVersion === 1 && album.pages?.length === 100 ? normalize(album) : createDefaultAlbum()
    } catch { return createDefaultAlbum() }
  }
  private async write(album: AlbumDocument) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...album, updatedAt: new Date().toISOString() })) }
  async getAlbum() { return copy(await this.read()) }
  async getPage(pageId: string) { return copy((await this.read()).pages.find((page) => page.id === pageId) ?? null) }
  async savePage(page: ScrapbookPage) { const album = await this.read(); await this.write({ ...album, pages: album.pages.map((current) => current.id === page.id ? copy(page) : current) }) }
  async saveElement(element: AlbumElement) { const album = await this.read(); const page = album.pages.find((current) => current.id === element.pageId); if (!page) return; page.elements = page.elements.map((current) => current.id === element.id ? copy(element) : current); await this.write(album) }
  async deleteElement(pageId: string, elementId: string) { const album = await this.read(); const page = album.pages.find((current) => current.id === pageId); if (!page) return; page.elements = page.elements.filter((element) => element.id !== elementId); await this.write(album) }
}
