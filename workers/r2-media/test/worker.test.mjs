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
