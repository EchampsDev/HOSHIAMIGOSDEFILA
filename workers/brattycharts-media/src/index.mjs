const firebaseIssuerRoot = 'https://securetoken.google.com/'
const firebaseJwksUrl = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const imageTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']])
const videoTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const maxImageBytes = 15 * 1024 * 1024
const maxVideoBytes = 100 * 1024 * 1024
let cachedJwks = null
let cachedJwksUntil = 0

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
const allowedOrigins = (env) => new Set(String(env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean))
const origin = (request) => request.headers.get('Origin') || ''
const cors = (request, env) => allowedOrigins(env).has(origin(request)) ? { 'Access-Control-Allow-Origin': origin(request), 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Background-Id', 'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS', 'Access-Control-Max-Age': '3600', Vary: 'Origin' } : { Vary: 'Origin' }
const withCors = (response, request, env) => { const headers = new Headers(response.headers); for (const [key, value] of Object.entries(cors(request, env))) headers.set(key, value); return new Response(response.body, { status: response.status, headers }) }
const failure = (message, status = 400) => json({ error: message }, status)

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), (character) => character.charCodeAt(0))
}

async function getJwks() {
  if (cachedJwks && Date.now() < cachedJwksUntil) return cachedJwks
  const response = await fetch(firebaseJwksUrl)
  if (!response.ok) throw new Error('No fue posible validar la sesión.')
  cachedJwks = await response.json()
  cachedJwksUntil = Date.now() + Number(response.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1] || 1800) * 1000
  return cachedJwks
}

async function identity(request, env) {
  const authorization = request.headers.get('Authorization') || ''
  if (!authorization.startsWith('Bearer ')) throw new Error('Se requiere una sesión administradora.')
  const token = authorization.slice(7).trim()
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Token inválido.')
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])))
  const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])))
  const jwk = (await getJwks()).keys?.find((candidate) => candidate.kid === header.kid)
  if (header.alg !== 'RS256' || !jwk) throw new Error('Token inválido.')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  const now = Math.floor(Date.now() / 1000)
  if (!valid || claims.aud !== env.FIREBASE_PROJECT_ID || claims.iss !== `${firebaseIssuerRoot}${env.FIREBASE_PROJECT_ID}` || !claims.sub || claims.exp <= now) throw new Error('La sesión expiró o pertenece a otro proyecto.')
  return { uid: claims.sub, token }
}

async function requireAdmin(request, env) {
  const user = await identity(request, env)
  const headers = { Authorization: `Bearer ${user.token}` }
  const root = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/`
  const [admin, role] = await Promise.all([fetch(`${root}admins/${encodeURIComponent(user.uid)}`, { headers }), fetch(`${root}userRoles/${encodeURIComponent(user.uid)}`, { headers })])
  if (!admin.ok) {
    if (!role.ok || (await role.json()).fields?.role?.stringValue !== 'ADMIN') throw new Error('Se requiere una cuenta administradora.')
  }
  return user
}

function safeKey(pathname) {
  try {
    const key = decodeURIComponent(pathname.replace(/^\/v1\/media\//, ''))
    return /^(?:backgrounds\/[0-9a-f-]{36}\.(?:jpg|png|webp)|video\/current)$/.test(key) ? key : null
  } catch { return null }
}

function hasExpectedImageSignature(bytes, type) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
  if (type === 'image/png') return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)
  if (type === 'image/webp') return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  return false
}

async function uploadBackground(request, env) {
  if (!allowedOrigins(env).has(origin(request))) return failure('Origen no autorizado.', 403)
  let user
  try { user = await requireAdmin(request, env) } catch (error) { return failure(error.message, 403) }
  const id = (request.headers.get('X-Background-Id') || '').trim()
  const type = (request.headers.get('Content-Type') || '').split(';')[0]
  if (!/^[0-9a-f-]{36}$/.test(id) || !imageTypes.has(type)) return failure('Imagen o identificador inválido.')
  const declared = Number(request.headers.get('Content-Length') || 0)
  if (declared > maxImageBytes) return failure('La imagen no puede superar 15 MB.', 413)
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (!bytes.length || bytes.length > maxImageBytes) return failure('La imagen no puede superar 15 MB.', 413)
  if (!hasExpectedImageSignature(bytes, type)) return failure('El contenido del archivo no coincide con una imagen válida.', 415)
  const key = `backgrounds/${id}.${imageTypes.get(type)}`
  await env.BRATTYCHARTS_BUCKET.put(key, bytes, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { kind: 'brattycharts-background', uploadedBy: user.uid } })
  return json({ objectKey: key, readUrl: `${new URL(request.url).origin}/v1/media/${key}` }, 201)
}

async function uploadVideo(request, env) {
  if (!allowedOrigins(env).has(origin(request))) return failure('Origen no autorizado.', 403)
  let user
  try { user = await requireAdmin(request, env) } catch (error) { return failure(error.message, 403) }
  const type = (request.headers.get('Content-Type') || '').split(';')[0]
  const declared = Number(request.headers.get('Content-Length') || 0)
  if (!videoTypes.has(type)) return failure('Usa MP4, MOV o WebM.')
  if (declared && declared > maxVideoBytes) return failure('El video no puede superar 100 MB.', 413)
  await env.BRATTYCHARTS_BUCKET.put('video/current', request.body, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=3600' }, customMetadata: { kind: 'brattycharts-video', uploadedBy: user.uid } })
  const stored = await env.BRATTYCHARTS_BUCKET.head('video/current')
  if (!stored || stored.size > maxVideoBytes) { await env.BRATTYCHARTS_BUCKET.delete('video/current'); return failure('El video no puede superar 100 MB.', 413) }
  return json({ objectKey: 'video/current', readUrl: `${new URL(request.url).origin}/v1/media/video/current` }, 201)
}

async function serve(request, env, key) {
  const object = await env.BRATTYCHARTS_BUCKET.get(key)
  if (!object) return failure('Archivo no encontrado.', 404)
  const headers = new Headers({ 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': object.httpMetadata?.cacheControl || 'public, max-age=3600' })
  if (object.httpEtag) headers.set('ETag', object.httpEtag)
  return new Response(request.method === 'HEAD' ? null : object.body, { headers })
}

async function remove(request, env, key) {
  if (!allowedOrigins(env).has(origin(request))) return failure('Origen no autorizado.', 403)
  try { await requireAdmin(request, env) } catch (error) { return failure(error.message, 403) }
  await env.BRATTYCHARTS_BUCKET.delete(key)
  return new Response(null, { status: 204 })
}

export default { async fetch(request, env) {
  const url = new URL(request.url)
  let response
  if (request.method === 'OPTIONS') response = allowedOrigins(env).has(origin(request)) ? new Response(null, { status: 204 }) : failure('Origen no autorizado.', 403)
  else if (request.method === 'GET' && url.pathname === '/health') response = json({ ok: true, service: 'brattycharts-media' })
  else if (request.method === 'POST' && url.pathname === '/v1/backgrounds') response = await uploadBackground(request, env)
  else if (request.method === 'POST' && url.pathname === '/v1/video') response = await uploadVideo(request, env)
  else if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname.startsWith('/v1/media/')) { const key = safeKey(url.pathname); response = key ? await serve(request, env, key) : failure('Ruta inválida.') }
  else if (request.method === 'DELETE' && url.pathname.startsWith('/v1/media/')) { const key = safeKey(url.pathname); response = key ? await remove(request, env, key) : failure('Ruta inválida.') }
  else response = failure('Ruta no encontrada.', 404)
  return withCors(response, request, env)
} }
