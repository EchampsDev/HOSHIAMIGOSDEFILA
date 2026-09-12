import { LocalStickerRepository } from './LocalStickerRepository'
import { LocalStickerStorageRepository } from './LocalStickerStorageRepository'

// Composition root temporal. Al activar Blaze, estos adaptadores podrán reemplazarse
// por implementaciones Firebase sin cambiar componentes ni reglas de dominio.
export const stickerRepository = new LocalStickerRepository()
export const stickerStorageRepository = new LocalStickerStorageRepository()
