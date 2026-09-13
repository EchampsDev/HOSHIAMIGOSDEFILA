import type { MediaMetadata } from '../../album/domain/types'
import type { ValidatedPhotoFile } from '../domain/photoValidation'
import type { PhotoStorageRepository } from './PhotoStorageRepository'

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No fue posible leer la foto.'))
    reader.readAsDataURL(file)
  })
}

export class LocalPhotoStorageRepository implements PhotoStorageRepository {
  readonly provider = 'local' as const

  async uploadPhoto(file: File, validation: ValidatedPhotoFile) {
    const dataUrl = await fileToDataUrl(file)
    return {
      media: {
        originalWidth: validation.originalWidth,
        originalHeight: validation.originalHeight,
        mimeType: validation.mimeType,
        fileSize: validation.fileSize,
        provider: 'local' as const,
        downloadUrl: dataUrl,
      },
      legacyContent: dataUrl,
    }
  }

  async resolvePhoto(media: MediaMetadata) {
    return media.downloadUrl ? { url: media.downloadUrl } : null
  }

  async deletePhoto() {}
}
