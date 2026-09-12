import type { CommunitySticker } from '../domain/types'
import type { ValidatedStickerFile } from '../domain/stickerFileValidation'

export type StoredStickerAsset = ValidatedStickerFile & {
  localAssetRef: string
  safeFileName: string
}

export interface StickerStorageRepository {
  uploadSticker(file: File, validation: ValidatedStickerFile): Promise<StoredStickerAsset>
  getStickerUrl(sticker: CommunitySticker): Promise<string | null>
  deleteStickerAsset(localAssetRef: string): Promise<void>
}
