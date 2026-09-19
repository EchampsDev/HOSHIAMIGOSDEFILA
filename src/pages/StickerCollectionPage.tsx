import { Layout } from '../components/Layout'
import { StickerLibrarySection } from '../features/stickers/components/StickerLibrarySection'

export function StickerCollectionPage() {
  return <Layout><main className="sticker-collection-page"><header><p className="eyebrow">ARCHIVO VISUAL</p><h1>Colección</h1><p>Explora los stickers de BRATTYPOLITAN por colección y conoce el nombre, la autoría y la historia detrás de cada pieza.</p></header><StickerLibrarySection /></main></Layout>
}
