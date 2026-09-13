import test from 'node:test'
import assert from 'node:assert/strict'
import { validateImage } from '../src/imageValidation.mjs'

test('acepta una cabecera PNG y conserva dimensiones', () => {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  new DataView(bytes.buffer).setUint32(16, 640)
  new DataView(bytes.buffer).setUint32(20, 480)
  assert.deepEqual(validateImage(bytes, 'image/png'), { mimeType: 'image/png', fileSize: 24, originalWidth: 640, originalHeight: 480, extension: 'png' })
})

test('rechaza MIME que no coincide con la firma', () => {
  assert.throws(() => validateImage(new Uint8Array([1, 2, 3]), 'image/png'), /imagen válida/)
})

test('rechaza tipos fuera del alcance', () => {
  assert.throws(() => validateImage(new Uint8Array([1]), 'image/gif'), /JPG, PNG o WEBP/)
})

test('acepta JPEG y obtiene dimensiones del segmento SOF', () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x08, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x00])
  assert.deepEqual(validateImage(bytes, 'image/jpeg'), { mimeType: 'image/jpeg', fileSize: 12, originalWidth: 640, originalHeight: 480, extension: 'jpg' })
})

test('acepta WEBP VP8X y obtiene dimensiones', () => {
  const bytes = new Uint8Array(30)
  bytes.set([82, 73, 70, 70], 0)
  bytes.set([87, 69, 66, 80], 8)
  bytes.set([86, 80, 56, 88], 12)
  bytes.set([0x7f, 0x02, 0x00], 24)
  bytes.set([0xdf, 0x01, 0x00], 27)
  assert.deepEqual(validateImage(bytes, 'image/webp'), { mimeType: 'image/webp', fileSize: 30, originalWidth: 640, originalHeight: 480, extension: 'webp' })
})

test('rechaza archivos mayores a 5 MB', () => {
  assert.throws(() => validateImage(new Uint8Array(5 * 1024 * 1024 + 1), 'image/png'), /máximo 5 MB/)
})
