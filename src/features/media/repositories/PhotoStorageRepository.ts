import type { MediaMetadata } from '../../album/domain/types'
import type { ValidatedPhotoFile } from '../domain/photoValidation'

export type StoredPhotoAsset = {
  media: MediaMetadata
  legacyContent?: string
}

export type ResolvedPhotoAsset = {
  url: string
  revoke?: () => void
}

export interface PhotoStorageRepository {
  readonly provider: 'local' | 'r2'
  uploadPhoto(file: File, validation: ValidatedPhotoFile, participantId: string, firebaseIdToken?: string, uploadId?: string, uploadToken?: string): Promise<StoredPhotoAsset>
  resolvePhoto(media: MediaMetadata, firebaseIdToken?: string): Promise<ResolvedPhotoAsset | null>
  deletePhoto(media: MediaMetadata, firebaseIdToken?: string): Promise<void>
}
