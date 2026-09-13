export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type PhotoMimeType = typeof PHOTO_ALLOWED_MIME_TYPES[number]

export type ValidatedPhotoFile = {
  mimeType: PhotoMimeType
  fileSize: number
  originalWidth: number
  originalHeight: number
}

const allowedMimeTypes = new Set<string>(PHOTO_ALLOWED_MIME_TYPES)

function hasValidSignature(bytes: Uint8Array, mimeType: PhotoMimeType) {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
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

export async function validatePhotoFile(file: File): Promise<ValidatedPhotoFile> {
  if (!allowedMimeTypes.has(file.type)) throw new Error('Usa una foto JPG, PNG o WEBP.')
  if (!file.size || file.size > PHOTO_MAX_BYTES) throw new Error('Selecciona una imagen de máximo 5 MB.')
  const mimeType = file.type as PhotoMimeType
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!hasValidSignature(signature, mimeType)) throw new Error('La extensión no coincide con el contenido real de la foto.')
  const dimensions = await readDimensions(file)
  if (!dimensions.width || !dimensions.height) throw new Error('No fue posible leer las dimensiones de la foto.')
  return { mimeType, fileSize: file.size, originalWidth: dimensions.width, originalHeight: dimensions.height }
}
