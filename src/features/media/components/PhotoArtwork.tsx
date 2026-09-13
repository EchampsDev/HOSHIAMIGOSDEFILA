import { useEffect, useState } from 'react'
import type { MediaMetadata } from '../../album/domain/types'
import { useGoogleSession } from '../../access/useGoogleSession'
import { photoStorageRepository } from '../repositories'

export function PhotoArtwork({ media, legacyContent, className, alt }: { media?: MediaMetadata; legacyContent?: string; className?: string; alt: string }) {
  const session = useGoogleSession()
  const immediate = legacyContent?.startsWith('data:image/') ? legacyContent : media?.provider !== 'r2' ? media?.downloadUrl : undefined
  const assetKey = media?.objectKey ?? ''
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(null)
  const source = immediate ?? (resolved?.key === assetKey ? resolved.url : undefined)

  useEffect(() => {
    if (immediate || !media) return
    let active = true
    let revoke: (() => void) | undefined
    void (async () => photoStorageRepository.resolvePhoto(media, session.user ? await session.user.getIdToken() : undefined))()
      .then((resolved) => {
        if (!active || !resolved) { resolved?.revoke?.(); return }
        revoke = resolved.revoke
        setResolved({ key: assetKey, url: resolved.url })
      })
      .catch(() => undefined)
    return () => { active = false; revoke?.() }
  }, [assetKey, immediate, media, session.user])

  return source ? <img className={className} src={source} alt={alt} /> : null
}
