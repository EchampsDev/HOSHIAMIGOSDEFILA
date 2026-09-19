import type { CommunitySticker } from '../domain/types'
import { validateStickerFile } from '../domain/stickerFileValidation'
import { stickerRepository, stickerStorageRepository } from '../repositories'

export async function createPendingSticker(file: File, title: string, authorName?: string, description?: string): Promise<CommunitySticker> {
  const validation = await validateStickerFile(file)
  const stored = await stickerStorageRepository.uploadSticker(file, validation)
  try {
    return await stickerRepository.createSticker({
      id: stored.id,
      title: title.trim() || 'Sticker de la comunidad',
      authorName: authorName?.trim() || undefined,
      description: description?.trim() || 'Aportación de la comunidad.',
      localAssetRef: stored.localAssetRef,
      assetUrl: stored.assetUrl,
      objectKey: stored.objectKey,
      provider: stored.provider,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      originalWidth: stored.originalWidth,
      originalHeight: stored.originalHeight,
      safeFileName: stored.safeFileName,
      status: 'PENDING',
      visibility: 'PUBLIC',
      publicApproved: false,
    })
  } catch (error) {
    const assetRef = stored.objectKey ?? stored.localAssetRef
    if (assetRef) await stickerStorageRepository.deleteStickerAsset(assetRef)
    throw error
  }
}
