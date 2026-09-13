import type { MediaMetadata } from '../../features/album/domain/types'
import type { ValidatedPhotoFile } from '../../features/media/domain/photoValidation'
import type { PhotoStorageRepository } from '../../features/media/repositories/PhotoStorageRepository'
import { r2Request } from './client'

const TOKEN_KEY = 'brattypolitan.r2.photo-tokens.v1'

type UploadResponse = {
  objectKey: string
  readUrl: string
  ownerToken: string
  mimeType: string
  fileSize: number
  originalWidth: number
  originalHeight: number
}

function readTokens(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? '{}') as Record<string, string> } catch { return {} }
}

function saveToken(objectKey: string, token: string) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...readTokens(), [objectKey]: token }))
}

function forgetToken(objectKey: string) {
  const tokens = readTokens()
  delete tokens[objectKey]
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export class CloudflareR2PhotoStorageRepository implements PhotoStorageRepository {
  readonly provider = 'r2' as const

  async uploadPhoto(file: File, validation: ValidatedPhotoFile, participantId: string, firebaseIdToken?: string) {
    const response = await r2Request('/v1/photos', {
      method: 'POST',
      body: file,
      headers: {
        'Content-Type': validation.mimeType,
        'X-Participant-Id': participantId,
        ...(firebaseIdToken ? { Authorization: `Bearer ${firebaseIdToken}` } : {}),
      },
    })
    const stored = await response.json() as UploadResponse
    saveToken(stored.objectKey, stored.ownerToken)
    return {
      media: {
        originalWidth: stored.originalWidth,
        originalHeight: stored.originalHeight,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        provider: 'r2' as const,
        objectKey: stored.objectKey,
        downloadUrl: stored.readUrl,
      },
    }
  }

  async resolvePhoto(media: MediaMetadata, firebaseIdToken?: string) {
    if (!media.objectKey || !media.downloadUrl) return null
    const ownerToken = readTokens()[media.objectKey]
    if (!ownerToken) return null
    const response = await fetch(media.downloadUrl, { headers: {
      ...(ownerToken ? { 'X-Media-Token': ownerToken } : {}),
      ...(firebaseIdToken ? { Authorization: `Bearer ${firebaseIdToken}` } : {}),
    } })
    if (!response.ok) return null
    const objectUrl = URL.createObjectURL(await response.blob())
    return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) }
  }

  async deletePhoto(media: MediaMetadata, firebaseIdToken?: string) {
    if (!media.objectKey || !media.downloadUrl) return
    const ownerToken = readTokens()[media.objectKey]
    await r2Request(`/v1/media/${media.objectKey}`, {
      method: 'DELETE',
      headers: {
        ...(ownerToken ? { 'X-Media-Token': ownerToken } : {}),
        ...(firebaseIdToken ? { Authorization: `Bearer ${firebaseIdToken}` } : {}),
      },
    })
    forgetToken(media.objectKey)
  }
}
