import { CloudflareR2PhotoStorageRepository } from '../../../infrastructure/r2/CloudflareR2PhotoStorageRepository'
import { isR2MediaConfigured } from '../../../infrastructure/r2/client'
import { LocalPhotoStorageRepository } from './LocalPhotoStorageRepository'
import type { PhotoStorageRepository } from './PhotoStorageRepository'

export const photoStorageRepository: PhotoStorageRepository = isR2MediaConfigured
  ? new CloudflareR2PhotoStorageRepository()
  : new LocalPhotoStorageRepository()
