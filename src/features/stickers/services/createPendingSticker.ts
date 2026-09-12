import type { CommunitySticker } from '../domain/types'
import { validateStickerFile } from '../domain/stickerFileValidation'
import { stickerRepository, stickerStorageRepository } from '../repositories'

export async function createPendingSticker(file: File, title: string, authorName?: string): Promise<CommunitySticker> {
  const validation = await validateStickerFile(file)
  const stored = await stickerStorageRepository.uploadSticker(file, validation)
  try {
    return await stickerRepository.createSticker({
      title: title.trim() || 'Sticker de la comunidad',
      authorName: authorName?.trim() || undefined,
      description: 'Aportación comunitaria pendiente de moderación.',
      localAssetRef: stored.localAssetRef,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      originalWidth: stored.originalWidth,
      originalHeight: stored.originalHeight,
      safeFileName: stored.safeFileName,
      status: 'PENDING',
      visibility: 'PUBLIC',
    })
  } catch (error) {
    await stickerStorageRepository.deleteStickerAsset(stored.localAssetRef)
    throw error
  }
}
