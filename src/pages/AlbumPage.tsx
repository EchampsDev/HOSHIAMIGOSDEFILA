import { AlbumExperiencePage } from '../features/album/AlbumExperiencePage'
import { AlbumLockedPage } from '../features/album/AlbumLockedPage'
import { usePublicAlbumAccess } from '../features/album/hooks/usePublicAlbumAccess'
import { BrattySurpriseGate } from '../features/bratty/components/BrattySurpriseGate'
export function AlbumPage() { const access = usePublicAlbumAccess(); return access.isUnlocked ? <BrattySurpriseGate><AlbumExperiencePage /></BrattySurpriseGate> : <AlbumLockedPage /> }
