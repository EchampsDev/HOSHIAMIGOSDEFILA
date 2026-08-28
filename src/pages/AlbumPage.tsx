import { AlbumExperiencePage } from '../features/album/AlbumExperiencePage'
import { AlbumLockedPage } from '../features/album/AlbumLockedPage'
import { usePublicAlbumAccess } from '../features/album/hooks/usePublicAlbumAccess'
export function AlbumPage() { const access = usePublicAlbumAccess(); return access.isUnlocked ? <AlbumExperiencePage /> : <AlbumLockedPage /> }
