import type { CommunitySticker, NewCommunitySticker } from '../domain/types'

export interface StickerRepository {
  getApprovedStickers(): Promise<CommunitySticker[]>
  getPendingStickers(): Promise<CommunitySticker[]>
  getSticker(id: string): Promise<CommunitySticker | null>
  createSticker(input: NewCommunitySticker): Promise<CommunitySticker>
  updateSticker(id: string, patch: Partial<Omit<CommunitySticker, 'id' | 'createdAt'>>): Promise<CommunitySticker>
  deleteSticker(id: string): Promise<void>
  subscribe?(listener: () => void): () => void
}
