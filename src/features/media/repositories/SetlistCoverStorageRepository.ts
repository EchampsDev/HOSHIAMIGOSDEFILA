import type { SetlistAlbum } from '../../album/data/localSetlistCatalog'
import { validatePhotoFile } from '../domain/photoValidation'
import { isR2MediaConfigured, r2Request } from '../../../infrastructure/r2/client'

type StoredCover = { objectKey: string; readUrl: string }

export const setlistCoverStorageRepository = {
  supportsUpload: isR2MediaConfigured,
  async upload(file: File, album: SetlistAlbum, firebaseIdToken: string) {
    const validation = await validatePhotoFile(file)
    const response = await r2Request('/v1/setlist-covers', {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': validation.mimeType, 'X-Album': album, Authorization: `Bearer ${firebaseIdToken}` },
    })
    return response.json() as Promise<StoredCover>
  },
  async delete(objectKey: string, firebaseIdToken: string) {
    await r2Request(`/v1/media/${objectKey}`, { method: 'DELETE', headers: { Authorization: `Bearer ${firebaseIdToken}` } })
  },
}
