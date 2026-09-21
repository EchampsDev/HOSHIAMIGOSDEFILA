import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.mjs'

const env = { ALLOWED_ORIGINS: 'https://brattypolitan-experience.web.app', FIREBASE_PROJECT_ID: 'brattypolitan-experience', BRATTY_SPECIAL_BUCKET: {} }

test('health identifica el servicio especial aislado', async () => {
  const response = await worker.fetch(new Request('https://media.example/health'), env)
  assert.deepEqual(await response.json(), { ok: true, service: 'bratty-special-media' })
})

test('rechaza cargas sin sesión autorizada', async () => {
  const response = await worker.fetch(new Request('https://media.example/v1/uploads', { method: 'POST', headers: { Origin: 'https://brattypolitan-experience.web.app', 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'video/mp4', size: 10 }) }), env)
  assert.equal(response.status, 403)
})

test('no expone rutas de aportaciones, stickers ni Brattycharts', async () => {
  for (const path of ['/v1/photos/current', '/v1/stickers/current', '/v1/backgrounds', '/v1/media/video/current']) {
    const response = await worker.fetch(new Request(`https://media.example${path}`), env)
    assert.notEqual(response.status, 200)
  }
})
