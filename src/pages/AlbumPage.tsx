import { AlbumExperiencePage } from '../features/album/AlbumExperiencePage'
import { AlbumLockedPage } from '../features/album/AlbumLockedPage'
import { publicAlbumAccess } from '../features/album/data/albumAccess'
export function AlbumPage() { return publicAlbumAccess.isUnlocked ? <AlbumExperiencePage /> : <AlbumLockedPage /> }
