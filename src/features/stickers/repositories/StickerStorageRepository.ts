import type { CommunitySticker } from '../domain/types'
import type { ValidatedStickerFile } from '../domain/stickerFileValidation'

export type StoredStickerAsset = ValidatedStickerFile & {
  id?: string
  assetUrl?: string
  localAssetRef?: string
  objectKey?: string
  provider: 'local' | 'r2'
  safeFileName: string
}

export interface StickerStorageRepository {
  uploadSticker(file: File, validation: ValidatedStickerFile): Promise<StoredStickerAsset>
  getStickerUrl(sticker: CommunitySticker): Promise<string | null>
  deleteStickerAsset(assetRef: string): Promise<void>
}
