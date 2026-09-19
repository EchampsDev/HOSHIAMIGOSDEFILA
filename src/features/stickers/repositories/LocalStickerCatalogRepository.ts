import { createDefaultStickerCatalog, normalizeStickerCatalog, type StickerCatalog } from '../domain/catalog'
import type { StickerCatalogRepository } from './StickerCatalogRepository'

const STORAGE_KEY = 'brattypolitan.sticker-catalog.v1'
const CHANGE_EVENT = 'brattypolitan-sticker-catalog-change'

function readCatalog() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? normalizeStickerCatalog(JSON.parse(stored) as StickerCatalog) : createDefaultStickerCatalog()
  } catch { return createDefaultStickerCatalog() }
}

export class LocalStickerCatalogRepository implements StickerCatalogRepository {
  async getCatalog() { return readCatalog() }
  async saveCatalog(catalog: StickerCatalog) {
    const normalized = normalizeStickerCatalog({ ...catalog, updatedAt: new Date().toISOString() })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return normalized
  }
  subscribe(listener: () => void) {
    window.addEventListener(CHANGE_EVENT, listener)
    window.addEventListener('storage', listener)
    return () => { window.removeEventListener(CHANGE_EVENT, listener); window.removeEventListener('storage', listener) }
  }
}
