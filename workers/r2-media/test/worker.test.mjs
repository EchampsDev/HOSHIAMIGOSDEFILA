import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import worker from '../src/index.mjs'

const env = {
  ALLOWED_ORIGINS: 'https://brattypolitan-experience.web.app,http://localhost:5173',
  FIREBASE_PROJECT_ID: 'brattypolitan-experience',
}

test('health no revela datos del bucket', async () => {
  const response = await worker.fetch(new Request('https://media.example/health'), env)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, bucket: 'private' })
})

test('preflight sólo autoriza orígenes configurados', async () => {
  const allowed = await worker.fetch(new Request('https://media.example/v1/photos', { method: 'OPTIONS', headers: { Origin: 'https://brattypolitan-experience.web.app' } }), env)
  assert.equal(allowed.status, 204)
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://brattypolitan-experience.web.app')
  const denied = await worker.fetch(new Request('https://media.example/v1/photos', { method: 'OPTIONS', headers: { Origin: 'https://malicioso.example' } }), env)
  assert.equal(denied.status, 403)
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null)
})

test('rechaza rutas de objetos manipuladas', async () => {
  const response = await worker.fetch(new Request('https://media.example/v1/media/../secret'), env)
  assert.equal(response.status, 404)
})

test('rechaza escapes URL malformados sin producir un error interno', async () => {
  const response = await worker.fetch(new Request('https://media.example/v1/media/photos/%25zz.jpg'), env)
  assert.equal(response.status, 400)
})

test('reintentos de foto con la misma solicitud reutilizan el objeto sin duplicarlo', async () => {
  const keys = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  const jwk = { ...(await webcrypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'photo-test' }
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = `${encode({ alg: 'RS256', kid: 'photo-test' })}.${encode({ aud: env.FIREBASE_PROJECT_ID, iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, sub: 'fan-1', iat: now, exp: now + 3600 })}`
  const signature = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(payload))
  const token = `${payload}.${Buffer.from(signature).toString('base64url')}`
  const objects = new Map()
  let writes = 0
  const bucket = {
    head: async (key) => objects.get(key) ?? null,
    put: async (key, bytes, options) => { writes += 1; objects.set(key, { size: bytes.length, httpMetadata: options.httpMetadata, customMetadata: options.customMetadata }) },
  }
  const uploadId = '123e4567-e89b-12d3-a456-426614174888'
  const uploadToken = 'owner-token-long-enough-for-an-idempotent-upload'
  const image = new Uint8Array(24)
  image.set([137, 80, 78, 71, 13, 10, 26, 10])
  new DataView(image.buffer).setUint32(16, 64)
  new DataView(image.buffer).setUint32(20, 64)
  const request = (tokenValue) => new Request('https://media.example/v1/photos', { method: 'POST', headers: { Origin: 'https://brattypolitan-experience.web.app', Authorization: `Bearer ${token}`, 'Content-Type': 'image/png', 'X-Participant-Id': 'fan-1', 'X-Upload-Id': uploadId, 'X-Upload-Token': tokenValue }, body: image })
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url) => String(url).includes('securetoken@system.gserviceaccount.com')
    ? new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })
    : new Response(null, { status: 404 })
  try {
    const first = await worker.fetch(request(uploadToken), { ...env, MEDIA_BUCKET: bucket })
    const second = await worker.fetch(request(uploadToken), { ...env, MEDIA_BUCKET: bucket })
    const conflict = await worker.fetch(request('another-owner-token-long-enough-for-retry'), { ...env, MEDIA_BUCKET: bucket })
    assert.equal(first.status, 201)
    assert.equal(second.status, 200)
    assert.equal(conflict.status, 409)
    assert.equal((await first.json()).objectKey, (await second.json()).objectKey)
    assert.equal(writes, 1)
  } finally { globalThis.fetch = previousFetch }
})

test('exige una sesión Firebase para subir stickers', async () => {
  const response = await worker.fetch(new Request('https://media.example/v1/stickers', {
    method: 'POST',
    headers: { Origin: 'https://brattypolitan-experience.web.app', 'Content-Type': 'image/png' },
    body: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
  }), env)
  assert.equal(response.status, 401)
})

test('sirve las portadas públicas de sencillos y colaboraciones', async () => {
  for (const collection of ['singles', 'collaborations']) {
    const key = `setlist-covers/${collection}/123e4567-e89b-12d3-a456-426614174000.webp`
    const response = await worker.fetch(new Request(`https://media.example/v1/media/${key}`), {
      ...env,
      MEDIA_BUCKET: { get: async () => ({ body: new Uint8Array([82, 73, 70, 70]), httpMetadata: { contentType: 'image/webp' }, etag: collection }) },
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=31536000, immutable')
  }
})

test('un sticker sólo es público después de la aprobación en Firestore', async () => {
  const key = 'stickers/123e4567-e89b-12d3-a456-426614174003.png'
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url) => String(url).includes('/communityStickers/123e4567-e89b-12d3-a456-426614174003')
    ? new Response(JSON.stringify({ fields: {
      objectKey: { stringValue: key },
      status: { stringValue: 'APPROVED' },
      visibility: { stringValue: 'PUBLIC' },
      publicApproved: { booleanValue: true },
    } }), { status: 200 })
    : new Response(null, { status: 404 })
  try {
    const response = await worker.fetch(new Request(`https://media.example/v1/media/${key}`), {
      ...env,
      MEDIA_BUCKET: { get: async () => ({ body: new Uint8Array([137, 80, 78, 71]), httpMetadata: { contentType: 'image/png' }, etag: 'sticker' }) },
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=31536000, immutable')
  } finally { globalThis.fetch = previousFetch }
})

test('mantiene privado un sticker pendiente para visitantes', async () => {
  const key = 'stickers/123e4567-e89b-12d3-a456-426614174004.webp'
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(null, { status: 403 })
  try {
    const response = await worker.fetch(new Request(`https://media.example/v1/media/${key}`), {
      ...env,
      MEDIA_BUCKET: { get: async () => ({ body: new Uint8Array([82, 73, 70, 70]), httpMetadata: { contentType: 'image/webp' }, customMetadata: {} }) },
    })
    assert.equal(response.status, 403)
  } finally { globalThis.fetch = previousFetch }
})

test('sirve públicamente una foto sólo cuando Firestore confirma su aprobación', async () => {
  const key = 'photos/123e4567-e89b-12d3-a456-426614174000.jpg'
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url) => String(url).includes('/approvedMedia/123e4567-e89b-12d3-a456-426614174000')
    ? new Response(JSON.stringify({ fields: { objectKey: { stringValue: key } } }), { status: 200 })
    : new Response(null, { status: 404 })
  try {
    const response = await worker.fetch(new Request(`https://media.example/v1/media/${key}`), {
      ...env,
      MEDIA_BUCKET: { get: async () => ({ body: new Uint8Array([255, 216, 255]), httpMetadata: { contentType: 'image/jpeg' }, etag: 'approved' }) },
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=31536000, immutable')
  } finally { globalThis.fetch = previousFetch }
})

test('mantiene privada una foto pendiente sin credenciales del propietario', async () => {
  const key = 'photos/123e4567-e89b-12d3-a456-426614174001.jpg'
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(null, { status: 404 })
  try {
    const response = await worker.fetch(new Request(`https://media.example/v1/media/${key}`), {
      ...env,
      MEDIA_BUCKET: { get: async () => ({ body: new Uint8Array([255, 216, 255]), httpMetadata: { contentType: 'image/jpeg' }, customMetadata: {} }) },
    })
    assert.equal(response.status, 403)
  } finally { globalThis.fetch = previousFetch }
})

test('mantiene privada una foto aprobada marcada como PRIVATE para visitantes', async () => {
  const key = 'photos/123e4567-e89b-12d3-a456-426614174002.jpg'
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url) => String(url).includes('/approvedMedia/123e4567-e89b-12d3-a456-426614174002')
    ? new Response(JSON.stringify({ fields: { objectKey: { stringValue: key }, visibility: { stringValue: 'PRIVATE' } } }), { status: 200 })
    : new Response(null, { status: 404 })
  try {
    const response = await worker.fetch(new Request(`https://media.example/v1/media/${key}`), {
      ...env,
      MEDIA_BUCKET: { get: async () => ({ body: new Uint8Array([255, 216, 255]), httpMetadata: { contentType: 'image/jpeg' }, etag: 'private-approved' }) },
    })
    assert.equal(response.status, 403)
  } finally { globalThis.fetch = previousFetch }
})
