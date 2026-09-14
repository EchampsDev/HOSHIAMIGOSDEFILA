import { isFirebaseConfigured } from '../../../infrastructure/firebase/client'
import { isR2MediaConfigured } from '../../../infrastructure/r2/client'
import { CloudflareR2StickerStorageRepository } from '../../../infrastructure/r2/CloudflareR2StickerStorageRepository'
import { FirestoreStickerRepository } from './FirestoreStickerRepository'
import { LocalStickerRepository } from './LocalStickerRepository'
import { LocalStickerStorageRepository } from './LocalStickerStorageRepository'
import type { StickerRepository } from './StickerRepository'
import type { StickerStorageRepository } from './StickerStorageRepository'

export const stickerRepository: StickerRepository = isFirebaseConfigured ? new FirestoreStickerRepository() : new LocalStickerRepository()
export const stickerStorageRepository: StickerStorageRepository = isFirebaseConfigured && isR2MediaConfigured
  ? new CloudflareR2StickerStorageRepository()
  : new LocalStickerStorageRepository()
