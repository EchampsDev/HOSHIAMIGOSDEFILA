import type { CommunitySticker } from '../domain/types'
import type { ValidatedStickerFile } from '../domain/stickerFileValidation'
import type { StickerStorageRepository, StoredStickerAsset } from './StickerStorageRepository'

const STORAGE_KEY = 'brattypolitan.sticker-library.assets.v1'

function readAssets(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string> }
  catch { return {} }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No fue posible leer el sticker.'))
    reader.readAsDataURL(file)
  })
}

export class LocalStickerStorageRepository implements StickerStorageRepository {
  async uploadSticker(file: File, validation: ValidatedStickerFile): Promise<StoredStickerAsset> {
    const assetId = crypto.randomUUID()
    const localAssetRef = `local://stickers/${assetId}.${validation.extension}`
    const assets = readAssets()
    assets[localAssetRef] = await fileToDataUrl(file)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(assets)) }
    catch { throw new Error('No hay espacio local suficiente para guardar este sticker.') }
    return { ...validation, localAssetRef, safeFileName: `sticker-${assetId}.${validation.extension}` }
  }
  async getStickerUrl(sticker: CommunitySticker) {
    if (sticker.assetUrl) return sticker.assetUrl
    return sticker.localAssetRef ? readAssets()[sticker.localAssetRef] ?? null : null
  }
  async deleteStickerAsset(localAssetRef: string) {
    const assets = readAssets()
    delete assets[localAssetRef]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets))
  }
}
