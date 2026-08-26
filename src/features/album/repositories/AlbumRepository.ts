import type { AlbumDocument, AlbumElement, ScrapbookPage } from '../domain/types'

export interface AlbumRepository {
  getAlbum(): Promise<AlbumDocument>
  getPage(pageId: string): Promise<ScrapbookPage | null>
  savePage(page: ScrapbookPage): Promise<void>
  saveElement(element: AlbumElement): Promise<void>
  deleteElement(pageId: string, elementId: string): Promise<void>
}
