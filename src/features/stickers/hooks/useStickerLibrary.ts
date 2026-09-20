import { useCallback, useEffect, useState } from 'react'
import type { CommunitySticker, StickerModerationStatus } from '../domain/types'
import { stickerRepository, stickerStorageRepository } from '../repositories'

export function useStickerLibrary(includePending = false) {
  const [approved, setApproved] = useState<CommunitySticker[]>([])
  const [pending, setPending] = useState<CommunitySticker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [approvedItems, pendingItems] = await Promise.all([
        stickerRepository.getApprovedStickers(),
        includePending ? stickerRepository.getPendingStickers() : Promise.resolve([]),
      ])
      setApproved(approvedItems)
      setPending(pendingItems)
      setError(null)
    } catch { setError('No fue posible cargar la biblioteca de stickers.') }
    finally { setLoading(false) }
  }, [includePending])

  useEffect(() => {
    queueMicrotask(() => void refresh())
    return stickerRepository.subscribe?.(() => void refresh(), includePending)
  }, [includePending, refresh])

  const updateStatus = useCallback(async (id: string, status: StickerModerationStatus) => {
    await stickerRepository.updateSticker(id, { status })
    await refresh()
  }, [refresh])

  const updateSticker = useCallback(async (id: string, patch: Partial<Pick<CommunitySticker, 'title' | 'authorName' | 'description' | 'visibility'>>) => {
    const updated = await stickerRepository.updateSticker(id, patch)
    await refresh()
    return updated
  }, [refresh])

  const deleteSticker = useCallback(async (id: string) => {
    const sticker = await stickerRepository.getSticker(id)
    if (!sticker) throw new Error('El sticker ya no existe.')
    await stickerRepository.deleteSticker(id)
    const assetRef = sticker.objectKey ?? sticker.localAssetRef
    if (assetRef) {
      try { await stickerStorageRepository.deleteStickerAsset(assetRef) }
      catch { /* El registro ya no es público; la limpieza del archivo puede reintentarse fuera de la UI. */ }
    }
    await refresh()
  }, [refresh])

  return { approved, pending, loading, error, refresh, updateStatus, updateSticker, deleteSticker }
}

export async function resolveStickerAsset(sticker: CommunitySticker) {
  return stickerStorageRepository.getStickerUrl(sticker)
}
