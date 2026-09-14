import type { AlbumElement } from '../domain/types'
import { PhotoArtwork } from '../../media/components/PhotoArtwork'
import { StickerArtwork } from '../../stickers/components/StickerArtwork'

const labels: Record<AlbumElement['type'], string> = {
  PHOTO: 'Foto', POST_IT: 'Post-it', HANDWRITTEN_NOTE: 'Nota', DRAWING: 'Dibujo',
  STICKER: 'Sticker', TEXT: 'Texto libre', SETLIST: 'Top 3 musical',
  PLACEHOLDER: 'Recuerdo', OTHER: 'Aportación',
}

export function AlbumElementPreview({ element, expanded = false }: { element: AlbumElement; expanded?: boolean }) {
  const postItClass = element.type === 'POST_IT' ? ` postit-${element.styleVariant ?? 'yellow'}` : ''
  return <div className={`album-contribution-artwork type-${element.type.toLowerCase()}${postItClass}${expanded ? ' is-expanded' : ''}`}>
    <span className="album-contribution-artwork-label">{labels[element.type]}</span>
    {element.type === 'PHOTO' ? <>
      <PhotoArtwork className="album-contribution-artwork-photo" media={element.media} legacyContent={element.content} alt={element.content?.trim() || 'Fotografía aportada a la libreta'} />
      {element.media && element.content?.trim() && <p>{element.content}</p>}
    </> : element.type === 'STICKER' && element.stickerId ?
      <StickerArtwork stickerId={element.stickerId} alt={element.content} className="album-contribution-artwork-sticker" /> :
      element.type === 'SETLIST' ? <ol>{element.setlist?.map((track, index) => <li key={track.id}><b>{String(index + 1).padStart(2, '0')}</b><span>{track.title}</span></li>)}</ol> :
      <p>{element.content || labels[element.type]}</p>}
  </div>
}
