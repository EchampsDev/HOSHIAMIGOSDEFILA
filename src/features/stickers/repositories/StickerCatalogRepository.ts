import type { StickerCatalog } from '../domain/catalog'

export interface StickerCatalogRepository {
  getCatalog(): Promise<StickerCatalog>
  saveCatalog(catalog: StickerCatalog): Promise<StickerCatalog>
  subscribe(listener: () => void): () => void
}
