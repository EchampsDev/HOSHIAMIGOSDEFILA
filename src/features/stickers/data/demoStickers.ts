import type { CommunitySticker } from '../domain/types'

const createdAt = '2026-09-12T00:00:00.000Z'

export const demoStickers: CommunitySticker[] = [
  { id: 'demo-four-point-star', title: 'Estrella roja', description: 'La estrella de cuatro puntas que acompaña la experiencia.', authorName: 'HOSHIAMIGOS DE FILA', assetUrl: '/images/stickers/demo-four-point-star.png', mimeType: 'image/png', fileSize: 292141, originalWidth: 1254, originalHeight: 1254, safeFileName: 'estrella-roja-hoshiamigos.png', status: 'APPROVED', visibility: 'PUBLIC', createdAt, updatedAt: createdAt },
  { id: 'demo-heart', title: 'Corazón brillante', description: 'Un corazón para dejar cariño en la libreta.', authorName: 'HOSHIAMIGOS DE FILA', assetUrl: '/images/stickers/demo-heart.png', mimeType: 'image/png', fileSize: 486038, originalWidth: 1254, originalHeight: 1254, safeFileName: 'corazon-brillante-hoshiamigos.png', status: 'APPROVED', visibility: 'PUBLIC', createdAt, updatedAt: createdAt },
  { id: 'demo-hoshiamigos', title: 'Órbita Hoshiamigos', description: 'Símbolo comunitario original creado para este módulo.', authorName: 'HOSHIAMIGOS DE FILA', assetUrl: '/images/stickers/demo-hoshiamigos.png', mimeType: 'image/png', fileSize: 559554, originalWidth: 1254, originalHeight: 1254, safeFileName: 'orbita-hoshiamigos.png', status: 'APPROVED', visibility: 'PUBLIC', createdAt, updatedAt: createdAt },
  { id: 'demo-post-it', title: 'Post-it Hoshi', description: 'Una nota amarilla lista para acompañar un recuerdo.', authorName: 'HOSHIAMIGOS DE FILA', assetUrl: '/images/stickers/demo-post-it.png', mimeType: 'image/png', fileSize: 497789, originalWidth: 1254, originalHeight: 1254, safeFileName: 'post-it-hoshi.png', status: 'APPROVED', visibility: 'PUBLIC', createdAt, updatedAt: createdAt },
]
