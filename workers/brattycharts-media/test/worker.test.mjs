import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.mjs'

const env = { ALLOWED_ORIGINS: 'https://brattypolitan-experience.web.app', FIREBASE_PROJECT_ID: 'brattypolitan-experience' }

test('health identifica sólo el servicio aislado', async () => {
  const response = await worker.fetch(new Request('https://media.example/health'), env)
  assert.deepEqual(await response.json(), { ok: true, service: 'brattycharts-media' })
})

test('rechaza rutas fuera de backgrounds y video', async () => {
  for (const path of ['photos/abc.jpg', 'stickers/abc.png', 'news/abc.jpg']) {
    const response = await worker.fetch(new Request(`https://media.example/v1/media/${path}`), env)
    assert.equal(response.status, 400)
  }
})

test('no permite subidas sin administración', async () => {
  const response = await worker.fetch(new Request('https://media.example/v1/backgrounds', { method: 'POST', headers: { Origin: 'https://brattypolitan-experience.web.app', 'Content-Type': 'image/png', 'X-Background-Id': '123e4567-e89b-12d3-a456-426614174000' }, body: new Uint8Array([1]) }), env)
  assert.equal(response.status, 403)
})

test('la lista segura nunca acepta rutas de la libreta', async () => {
  for (const path of ['contributions/abc.jpg', 'album/photos/abc.jpg', 'uploads/stickers/abc.png']) {
    const response = await worker.fetch(new Request(`https://media.example/v1/media/${path}`), env)
    assert.equal(response.status, 400)
  }
})
