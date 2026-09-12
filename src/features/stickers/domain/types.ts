export type StickerModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type StickerVisibility = 'PUBLIC' | 'SPECIAL_ONLY' | 'PRIVATE'

export type CommunitySticker = {
  id: string
  title: string
  authorName?: string
  description?: string
  assetUrl?: string
  localAssetRef?: string
  mimeType: 'image/png' | 'image/webp'
  fileSize: number
  originalWidth: number
  originalHeight: number
  displayWidth?: number
  displayHeight?: number
  safeFileName: string
  status: StickerModerationStatus
  visibility: StickerVisibility
  createdAt: string
  updatedAt: string
}

export type NewCommunitySticker = Omit<CommunitySticker, 'id' | 'createdAt' | 'updatedAt'>

export function isPublicApprovedSticker(sticker: CommunitySticker) {
  return sticker.status === 'APPROVED' && sticker.visibility === 'PUBLIC'
}
