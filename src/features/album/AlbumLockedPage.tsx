import { Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { publicAlbumAccess } from './data/albumAccess'
import { SpiralBinding } from './components/SpiralBinding'

export function AlbumLockedPage() {
  return <Layout><section className="album-lock-page"><div className="album-lock-cover" aria-hidden="true"><SpiralBinding cover /><span>BRATTYPOLITAN</span><b>ARCHIVO<br />EN PAUSA</b><i>✦</i></div><div><p className="eyebrow">LIBRETA DIGITAL</p><h1>{publicAlbumAccess.title}</h1><p>{publicAlbumAccess.description}</p><Link className="button secondary" to="/explorar">Volver a explorar</Link></div></section></Layout>
}
