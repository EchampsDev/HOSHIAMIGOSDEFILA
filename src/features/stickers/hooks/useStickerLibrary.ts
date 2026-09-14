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

  return { approved, pending, loading, error, refresh, updateStatus }
}

export async function resolveStickerAsset(sticker: CommunitySticker) {
  return stickerStorageRepository.getStickerUrl(sticker)
}
