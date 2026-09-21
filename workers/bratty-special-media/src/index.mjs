const firebaseIssuerRoot = 'https://securetoken.google.com/'
const firebaseJwksUrl = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const videoTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const maxVideoBytes = 300 * 1024 * 1024
const chunkBytes = 8 * 1024 * 1024
const videoKey = 'bratty-surprise/current/video'
let cachedJwks = null
let cachedJwksUntil = 0

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
const failure = (message, status = 400) => json({ error: message }, status)
const allowedOrigins = (env) => new Set(String(env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean))
const requestOrigin = (request) => request.headers.get('Origin') || ''
const cors = (request, env) => allowedOrigins(env).has(requestOrigin(request)) ? { 'Access-Control-Allow-Origin': requestOrigin(request), 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '3600', Vary: 'Origin' } : { Vary: 'Origin' }
const withCors = (response, request, env) => { const headers = new Headers(response.headers); for (const [key, value] of Object.entries(cors(request, env))) headers.set(key, value); return new Response(response.body, { status: response.status, headers }) }

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
  if (!authorization.startsWith('Bearer ')) throw new Error('Se requiere la sesión especial o administradora.')
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

async function requireUploader(request, env) {
  const user = await identity(request, env)
  const headers = { Authorization: `Bearer ${user.token}` }
  const root = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/`
  const [admin, role] = await Promise.all([fetch(`${root}admins/${encodeURIComponent(user.uid)}`, { headers }), fetch(`${root}userRoles/${encodeURIComponent(user.uid)}`, { headers })])
  if (!admin.ok) {
    const value = role.ok ? (await role.json()).fields?.role?.stringValue : ''
    if (value !== 'ADMIN' && value !== 'SPECIAL') throw new Error('Esta cuenta aún no tiene acceso para cargar el video.')
  }
  return user
}

async function session(env, sessionId) {
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) return null
  const object = await env.BRATTY_SPECIAL_BUCKET.get(`_uploads/${sessionId}.json`)
  if (!object) return null
  try { return JSON.parse(await object.text()) } catch { return null }
}

async function createUpload(request, env, user) {
  const input = await request.json().catch(() => ({}))
  const size = Number(input.size)
  const contentType = String(input.contentType || '')
  const originalName = String(input.originalName || '').slice(0, 180)
  if (!videoTypes.has(contentType)) return failure('Usa un video MP4, MOV o WebM.')
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxVideoBytes) return failure('El video debe pesar máximo 300 MB.', 413)
  const multipart = await env.BRATTY_SPECIAL_BUCKET.createMultipartUpload(videoKey, { httpMetadata: { contentType, cacheControl: 'public, max-age=300' }, customMetadata: { kind: 'bratty-special-video', uploadedBy: user.uid, originalName } })
  const sessionId = crypto.randomUUID()
  const metadata = { uploadId: multipart.uploadId, ownerUid: user.uid, size, contentType, expectedParts: Math.ceil(size / chunkBytes), createdAt: new Date().toISOString() }
  await env.BRATTY_SPECIAL_BUCKET.put(`_uploads/${sessionId}.json`, JSON.stringify(metadata), { httpMetadata: { contentType: 'application/json' } })
  return json({ sessionId, chunkBytes }, 201)
}

async function uploadPart(request, env, user, sessionId, partNumber) {
  const metadata = await session(env, sessionId)
  if (!metadata) return failure('La sesión de carga ya no existe.', 404)
  if (metadata.ownerUid !== user.uid) return failure('La sesión de carga pertenece a otra cuenta.', 403)
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > metadata.expectedParts) return failure('Número de parte inválido.')
  const declared = Number(request.headers.get('Content-Length') || 0)
  const expected = partNumber === metadata.expectedParts ? metadata.size - chunkBytes * (metadata.expectedParts - 1) : chunkBytes
  if (declared && declared !== expected) return failure('El tamaño de la parte no coincide con la carga iniciada.', 413)
  const multipart = env.BRATTY_SPECIAL_BUCKET.resumeMultipartUpload(videoKey, metadata.uploadId)
  const uploaded = await multipart.uploadPart(partNumber, request.body)
  return json({ partNumber: uploaded.partNumber, etag: uploaded.etag })
}

async function completeUpload(request, env, user, sessionId) {
  const metadata = await session(env, sessionId)
  if (!metadata) return failure('La sesión de carga ya no existe.', 404)
  if (metadata.ownerUid !== user.uid) return failure('La sesión de carga pertenece a otra cuenta.', 403)
  const input = await request.json().catch(() => ({}))
  const parts = Array.isArray(input.parts) ? input.parts : []
  const valid = parts.length === metadata.expectedParts && parts.every((part, index) => part?.partNumber === index + 1 && typeof part.etag === 'string' && part.etag.length > 0)
  if (!valid) return failure('La lista de partes está incompleta o desordenada.')
  const multipart = env.BRATTY_SPECIAL_BUCKET.resumeMultipartUpload(videoKey, metadata.uploadId)
  await multipart.complete(parts)
  const stored = await env.BRATTY_SPECIAL_BUCKET.head(videoKey)
  if (!stored || stored.size !== metadata.size || stored.size > maxVideoBytes) { await env.BRATTY_SPECIAL_BUCKET.delete(videoKey); return failure('El video recibido no coincide con la carga iniciada.', 413) }
  await env.BRATTY_SPECIAL_BUCKET.delete(`_uploads/${sessionId}.json`)
  return json({ videoUrl: `${new URL(request.url).origin}/v1/video/current`, storagePath: videoKey })
}

async function abortUpload(env, user, sessionId) {
  const metadata = await session(env, sessionId)
  if (!metadata) return new Response(null, { status: 204 })
  if (metadata.ownerUid !== user.uid) return failure('La sesión de carga pertenece a otra cuenta.', 403)
  await env.BRATTY_SPECIAL_BUCKET.resumeMultipartUpload(videoKey, metadata.uploadId).abort().catch(() => undefined)
  await env.BRATTY_SPECIAL_BUCKET.delete(`_uploads/${sessionId}.json`)
  return new Response(null, { status: 204 })
}

async function serveVideo(request, env) {
  if (request.method === 'HEAD') {
    const object = await env.BRATTY_SPECIAL_BUCKET.head(videoKey)
    if (!object) return failure('Video no encontrado.', 404)
    return new Response(null, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'video/mp4', 'Content-Length': String(object.size), 'Cache-Control': 'public, max-age=300', 'Accept-Ranges': 'bytes', ETag: object.httpEtag || '' } })
  }
  const hasRange = Boolean(request.headers.get('Range'))
  const object = await env.BRATTY_SPECIAL_BUCKET.get(videoKey, hasRange ? { range: request.headers } : undefined)
  if (!object) return failure('Video no encontrado.', 404)
  const headers = new Headers({ 'Content-Type': object.httpMetadata?.contentType || 'video/mp4', 'Cache-Control': 'public, max-age=300', 'Accept-Ranges': 'bytes' })
  if (object.httpEtag) headers.set('ETag', object.httpEtag)
  if (object.range && 'offset' in object.range) {
    headers.set('Content-Range', `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`)
    headers.set('Content-Length', String(object.range.length))
    return new Response(object.body, { status: 206, headers })
  }
  headers.set('Content-Length', String(object.size))
  return new Response(object.body, { headers })
}

export default { async fetch(request, env) {
  const url = new URL(request.url)
  let response
  if (request.method === 'OPTIONS') response = allowedOrigins(env).has(requestOrigin(request)) ? new Response(null, { status: 204 }) : failure('Origen no autorizado.', 403)
  else if (request.method === 'GET' && url.pathname === '/health') response = json({ ok: true, service: 'bratty-special-media' })
  else if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/v1/video/current') response = await serveVideo(request, env)
  else if (!allowedOrigins(env).has(requestOrigin(request))) response = failure('Origen no autorizado.', 403)
  else {
    let user
    try { user = await requireUploader(request, env) } catch (error) { response = failure(error.message, 403) }
    if (user) {
      const partMatch = url.pathname.match(/^\/v1\/uploads\/([0-9a-f-]{36})\/parts\/(\d+)$/)
      const completeMatch = url.pathname.match(/^\/v1\/uploads\/([0-9a-f-]{36})\/complete$/)
      const sessionMatch = url.pathname.match(/^\/v1\/uploads\/([0-9a-f-]{36})$/)
      if (request.method === 'POST' && url.pathname === '/v1/uploads') response = await createUpload(request, env, user)
      else if (request.method === 'PUT' && partMatch) response = await uploadPart(request, env, user, partMatch[1], Number(partMatch[2]))
      else if (request.method === 'POST' && completeMatch) response = await completeUpload(request, env, user, completeMatch[1])
      else if (request.method === 'DELETE' && sessionMatch) response = await abortUpload(env, user, sessionMatch[1])
      else response = failure('Ruta no encontrada.', 404)
    }
  }
  return withCors(response || failure('Ruta no encontrada.', 404), request, env)
} }
