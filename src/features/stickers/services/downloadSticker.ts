import type { CommunitySticker } from '../domain/types'
import { stickerStorageRepository } from '../repositories'

export async function downloadSticker(sticker: CommunitySticker) {
  const source = await stickerStorageRepository.getStickerUrl(sticker)
  if (!source) throw new Error('El archivo del sticker no está disponible.')
  const blob = await fetch(source).then((response) => {
    if (!response.ok) throw new Error('No fue posible descargar el sticker.')
    return response.blob()
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = sticker.safeFileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => { link.remove(); URL.revokeObjectURL(url) }, 30_000)
}
