export const STICKER_MAX_BYTES = 5 * 1024 * 1024
export const STICKER_MIN_DIMENSION = 32
export const STICKER_MAX_DIMENSION = 1024

export type ValidatedStickerFile = {
  mimeType: 'image/png' | 'image/webp'
  extension: 'png' | 'webp'
  fileSize: number
  originalWidth: number
  originalHeight: number
}

const allowedMimeTypes = new Set(['image/png', 'image/webp'])

function hasValidSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

async function readDimensions(file: File) {
  const source = URL.createObjectURL(file)
  try {
    const image = new Image()
    const loaded = new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('El archivo no contiene una imagen válida.'))
    })
    image.src = source
    return await loaded
  } finally {
    URL.revokeObjectURL(source)
  }
}

export async function validateStickerFile(file: File): Promise<ValidatedStickerFile> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!allowedMimeTypes.has(file.type) || (extension !== 'png' && extension !== 'webp')) throw new Error('Usa un archivo PNG o WEBP real.')
  if (!file.size || file.size > STICKER_MAX_BYTES) throw new Error('El sticker debe pesar como máximo 5 MB.')
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!hasValidSignature(signature, file.type)) throw new Error('La extensión no coincide con el contenido real del archivo.')
  const dimensions = await readDimensions(file)
  if (dimensions.width < STICKER_MIN_DIMENSION || dimensions.height < STICKER_MIN_DIMENSION) throw new Error(`El sticker debe medir al menos ${STICKER_MIN_DIMENSION} × ${STICKER_MIN_DIMENSION} px.`)
  if (dimensions.width > STICKER_MAX_DIMENSION || dimensions.height > STICKER_MAX_DIMENSION) throw new Error(`El sticker no puede superar ${STICKER_MAX_DIMENSION} × ${STICKER_MAX_DIMENSION} px.`)
  return { mimeType: file.type as ValidatedStickerFile['mimeType'], extension, fileSize: file.size, originalWidth: dimensions.width, originalHeight: dimensions.height }
}
