import { useEffect, useState } from 'react'
import { stickerRepository, stickerStorageRepository } from '../repositories'

export function StickerArtwork({ stickerId, alt, className }: { stickerId: string; alt?: string; className?: string }) {
  const [source, setSource] = useState<string | null>(null)
  const [title, setTitle] = useState(alt ?? 'Sticker comunitario')
  useEffect(() => {
    let active = true
    const load = async () => {
      const sticker = await stickerRepository.getSticker(stickerId)
      const url = sticker ? await stickerStorageRepository.getStickerUrl(sticker) : null
      if (active) { setSource(url); setTitle(alt ?? sticker?.title ?? 'Sticker comunitario') }
    }
    void load()
    const unsubscribe = stickerRepository.subscribe?.(() => void load())
    return () => { active = false; unsubscribe?.() }
  }, [alt, stickerId])
  return source ? <img className={className} src={source} alt={title} draggable={false} /> : <span className={className} aria-label={title}>✦</span>
}
