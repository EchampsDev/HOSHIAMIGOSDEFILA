import type { CommunitySticker } from '../../features/stickers/domain/types'
import type { ValidatedStickerFile } from '../../features/stickers/domain/stickerFileValidation'
import type { StickerStorageRepository } from '../../features/stickers/repositories/StickerStorageRepository'
import { firebaseAuth } from '../firebase/client'
import { r2Request } from './client'

const TOKEN_KEY = 'brattypolitan.r2.sticker-tokens.v1'

type UploadResponse = ValidatedStickerFile & {
  id: string
  objectKey: string
  readUrl: string
  ownerToken: string
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

export class CloudflareR2StickerStorageRepository implements StickerStorageRepository {
  async uploadSticker(file: File, validation: ValidatedStickerFile) {
    const user = firebaseAuth?.currentUser
    if (!user) throw new Error('Inicia sesión con Google para enviar un sticker a revisión.')
    const response = await r2Request('/v1/stickers', {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': validation.mimeType, Authorization: `Bearer ${await user.getIdToken()}` },
    })
    const stored = await response.json() as UploadResponse
    saveToken(stored.objectKey, stored.ownerToken)
    return {
      ...validation,
      id: stored.id,
      assetUrl: stored.readUrl,
      objectKey: stored.objectKey,
      provider: 'r2' as const,
      safeFileName: `sticker-${stored.id}.${validation.extension}`,
    }
  }

  async getStickerUrl(sticker: CommunitySticker) {
    if (!sticker.assetUrl) return null
    if (sticker.provider !== 'r2' || sticker.publicApproved) return sticker.assetUrl
    const ownerToken = sticker.objectKey ? readTokens()[sticker.objectKey] : undefined
    const user = firebaseAuth?.currentUser
    const response = await fetch(sticker.assetUrl, { headers: {
      ...(ownerToken ? { 'X-Media-Token': ownerToken } : {}),
      ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
    } })
    if (!response.ok) return null
    return URL.createObjectURL(await response.blob())
  }

  async deleteStickerAsset(objectKey: string) {
    const ownerToken = readTokens()[objectKey]
    const user = firebaseAuth?.currentUser
    await r2Request(`/v1/media/${objectKey}`, { method: 'DELETE', headers: {
      ...(ownerToken ? { 'X-Media-Token': ownerToken } : {}),
      ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
    } })
    forgetToken(objectKey)
  }
}
