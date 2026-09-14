import test from 'node:test'
import assert from 'node:assert/strict'
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
