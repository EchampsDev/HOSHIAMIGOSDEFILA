export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const readUint16 = (bytes, offset, littleEndian = false) => littleEndian
  ? bytes[offset] | (bytes[offset + 1] << 8)
  : (bytes[offset] << 8) | bytes[offset + 1]
const readUint24LE = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
const ascii = (bytes, start, length) => String.fromCharCode(...bytes.slice(start, start + length))

function pngDimensions(bytes) {
  if (bytes.length < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20), extension: 'png' }
}

function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  let offset = 2
  while (offset + 8 < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset]
    offset += 1
    if (marker === 0xd8 || marker === 0xd9) continue
    const length = readUint16(bytes, offset)
    if (length < 2 || offset + length > bytes.length) return null
    if (startOfFrame.has(marker)) return { width: readUint16(bytes, offset + 5), height: readUint16(bytes, offset + 3), extension: 'jpg' }
    offset += length
  }
  return null
}

function webpDimensions(bytes) {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return null
  const chunk = ascii(bytes, 12, 4)
  if (chunk === 'VP8X') return { width: readUint24LE(bytes, 24) + 1, height: readUint24LE(bytes, 27) + 1, extension: 'webp' }
  if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: readUint16(bytes, 26, true) & 0x3fff, height: readUint16(bytes, 28, true) & 0x3fff, extension: 'webp' }
  }
  if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    const width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8)
    const height = 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10)
    return { width, height, extension: 'webp' }
  }
  return null
}

export function validateImage(bytes, contentType) {
  if (!(bytes instanceof Uint8Array) || !bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('La imagen debe pesar como máximo 5 MB.')
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new Error('Usa una imagen JPG, PNG o WEBP.')
  const parsed = contentType === 'image/png' ? pngDimensions(bytes) : contentType === 'image/jpeg' ? jpegDimensions(bytes) : webpDimensions(bytes)
  if (!parsed || !parsed.width || !parsed.height) throw new Error('El MIME no coincide con una imagen válida.')
  return { mimeType: contentType, fileSize: bytes.byteLength, originalWidth: parsed.width, originalHeight: parsed.height, extension: parsed.extension }
}
