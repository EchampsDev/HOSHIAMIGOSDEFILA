import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { StickerCollectionManager } from '../features/stickers/components/StickerCollectionManager'

export function AdminStickerCollectionPage() {
  return <Layout><main className="sticker-manager-page"><nav><Link to="/admin/experiencias">← Volver a herramientas</Link><Link to="/coleccion">Ver colección pública</Link></nav><StickerCollectionManager /></main></Layout>
}
