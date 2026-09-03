import { Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { publicAlbumAccess } from './data/albumAccess'
import { ScrapbookCoverArtwork } from './components/Scrapbook'

export function AlbumLockedPage() {
  return <Layout><section className="album-lock-page"><div className="scrapbook-cover front-cover album-lock-cover is-disabled" aria-label="Libreta desactivada"><ScrapbookCoverArtwork bookmarkPage={1} /></div><div><p className="eyebrow">LIBRETA DIGITAL</p><h1>{publicAlbumAccess.title}</h1><p>{publicAlbumAccess.description}</p><Link className="button secondary" to="/explorar">Volver a explorar</Link></div></section></Layout>
}
