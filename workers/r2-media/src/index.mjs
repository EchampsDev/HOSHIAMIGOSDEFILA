import { MAX_IMAGE_BYTES, validateImage } from './imageValidation.mjs'

const albums = new Set(['DELUSION', 'TRES', 'TDBN', 'HOSHI'])
const firebaseIssuerRoot = 'https://securetoken.google.com/'
const firebaseJwksUrl = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
let cachedJwks = null
let cachedJwksUntil = 0

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } })
const errorResponse = (message, status, headers) => json({ error: message }, status, headers)
const allowedOrigins = (env) => new Set(String(env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean))
const requestOrigin = (request) => request.headers.get('Origin') || ''
const isAllowedOrigin = (request, env) => allowedOrigins(env).has(requestOrigin(request))
const corsHeaders = (request, env) => isAllowedOrigin(request, env) ? {
  'Access-Control-Allow-Origin': requestOrigin(request),
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Album, X-Media-Token, X-Participant-Id',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'ETag',
  'Access-Control-Max-Age': '3600',
  Vary: 'Origin',
} : { Vary: 'Origin' }
const withCors = (response, request, env) => {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

async function getFirebaseJwks() {
  if (cachedJwks && Date.now() < cachedJwksUntil) return cachedJwks
  const response = await fetch(firebaseJwksUrl)
  if (!response.ok) throw new Error('No fue posible validar la sesión de Firebase.')
  cachedJwks = await response.json()
  const maxAge = Number(response.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1] || 1800)
  cachedJwksUntil = Date.now() + maxAge * 1000
  return cachedJwks
}

async function verifyFirebaseToken(token, env) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Token de Firebase inválido.')
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])))
  const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])))
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Token de Firebase inválido.')
  const jwks = await getFirebaseJwks()
  const jwk = jwks.keys?.find((candidate) => candidate.kid === header.kid)
  if (!jwk) throw new Error('Firma de Firebase desconocida.')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64Url(parts[2]), signed)
  const now = Math.floor(Date.now() / 1000)
  if (!valid || claims.aud !== env.FIREBASE_PROJECT_ID || claims.iss !== `${firebaseIssuerRoot}${env.FIREBASE_PROJECT_ID}` || !claims.sub || claims.exp <= now || claims.iat > now) throw new Error('La sesión de Firebase expiró o no pertenece a este proyecto.')
  return { uid: claims.sub }
}

function bearerToken(request) {
  const authorization = request.headers.get('Authorization') || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

async function optionalIdentity(request, env) {
  const token = bearerToken(request)
  if (!token) return null
  return { ...(await verifyFirebaseToken(token, env)), token }
}

const firestoreDocumentUrl = (env, path) => `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/${path}`

async function isAdministrator(identity, env) {
  if (!identity) return false
  const headers = { Authorization: `Bearer ${identity.token}` }
  const [admin, role] = await Promise.all([
    fetch(firestoreDocumentUrl(env, `admins/${encodeURIComponent(identity.uid)}`), { headers }),
    fetch(firestoreDocumentUrl(env, `userRoles/${encodeURIComponent(identity.uid)}`), { headers }),
  ])
  if (admin.ok) return true
  if (!role.ok) return false
  const document = await role.json()
  return document.fields?.role?.stringValue === 'ADMIN'
}

async function isParticipationOpen(env) {
  const response = await fetch(firestoreDocumentUrl(env, 'siteConfig/participationAccess'))
  if (!response.ok) return false
  const document = await response.json()
  return document.fields?.isOpen?.booleanValue === true
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeEqual(first, second) {
  if (!first || !second || first.length !== second.length) return false
  let difference = 0
  for (let index = 0; index < first.length; index += 1) difference |= first.charCodeAt(index) ^ second.charCodeAt(index)
  return difference === 0
}

async function imageBody(request) {
  const declaredSize = Number(request.headers.get('Content-Length') || 0)
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error('La imagen debe pesar como máximo 5 MB.')
  const bytes = new Uint8Array(await request.arrayBuffer())
  return { bytes, validation: validateImage(bytes, (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase()) }
}

async function applyRateLimit(binding, key) {
  if (!binding) return true
  return (await binding.limit({ key })).success
}

async function uploadPhoto(request, env) {
  if (!isAllowedOrigin(request, env)) return errorResponse('Origen no autorizado.', 403)
  let identity
  try { identity = await optionalIdentity(request, env) } catch (error) { return errorResponse(error.message, 401) }
  if (!identity && !(await isParticipationOpen(env))) return errorResponse('La recepción de recuerdos está cerrada.', 403)
  const participantId = (request.headers.get('X-Participant-Id') || '').trim()
  if (!participantId || participantId.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(participantId)) return errorResponse('Identidad de participación inválida.', 400)
  const actorKey = identity?.uid || request.headers.get('CF-Connecting-IP') || participantId
  if (!(await applyRateLimit(env.PHOTO_UPLOAD_LIMITER, `photo:${actorKey}`))) return errorResponse('Alcanzaste el límite temporal de fotografías.', 429)
  let body
  try { body = await imageBody(request) } catch (error) { return errorResponse(error.message, 400) }
  const id = crypto.randomUUID()
  const objectKey = `photos/${id}.${body.validation.extension}`
  const ownerToken = randomToken()
  await env.MEDIA_BUCKET.put(objectKey, body.bytes, {
    httpMetadata: { contentType: body.validation.mimeType, cacheControl: 'private, no-store' },
    customMetadata: {
      kind: 'fan-photo',
      ownerId: participantId,
      ownerUid: identity?.uid || '',
      ownerTokenHash: await sha256(ownerToken),
      originalWidth: String(body.validation.originalWidth),
      originalHeight: String(body.validation.originalHeight),
    },
  })
  const readUrl = `${new URL(request.url).origin}/v1/media/${objectKey}`
  return json({ objectKey, readUrl, ownerToken, ...body.validation }, 201)
}

async function uploadSetlistCover(request, env) {
  if (!isAllowedOrigin(request, env)) return errorResponse('Origen no autorizado.', 403)
  let identity
  try { identity = await optionalIdentity(request, env) } catch (error) { return errorResponse(error.message, 401) }
  if (!identity || !(await isAdministrator(identity, env))) return errorResponse('Se requiere una cuenta administradora.', 403)
  const album = (request.headers.get('X-Album') || '').trim().toUpperCase()
  if (!albums.has(album)) return errorResponse('Álbum inválido.', 400)
  if (!(await applyRateLimit(env.COVER_UPLOAD_LIMITER, `cover:${identity.uid}`))) return errorResponse('Alcanzaste el límite temporal de portadas.', 429)
  let body
  try { body = await imageBody(request) } catch (error) { return errorResponse(error.message, 400) }
  const objectKey = `setlist-covers/${album.toLowerCase()}/${crypto.randomUUID()}.${body.validation.extension}`
  await env.MEDIA_BUCKET.put(objectKey, body.bytes, {
    httpMetadata: { contentType: body.validation.mimeType, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { kind: 'setlist-cover', album, uploadedBy: identity.uid, originalWidth: String(body.validation.originalWidth), originalHeight: String(body.validation.originalHeight) },
  })
  return json({ objectKey, readUrl: `${new URL(request.url).origin}/v1/media/${objectKey}`, ...body.validation }, 201)
}

function validObjectKey(pathname) {
  try {
    const key = decodeURIComponent(pathname.replace(/^\/v1\/media\//, ''))
    return /^(?:photos\/[0-9a-f-]+|setlist-covers\/(?:delusion|tres|tdbn|hoshi)\/[0-9a-f-]+)\.(?:jpg|png|webp)$/.test(key) ? key : null
  } catch {
    return null
  }
}

async function canReadPhoto(request, object, env) {
  const suppliedToken = request.headers.get('X-Media-Token') || ''
  if (suppliedToken && safeEqual(await sha256(suppliedToken), object.customMetadata?.ownerTokenHash || '')) return true
  try {
    const identity = await optionalIdentity(request, env)
    if (!identity) return false
    if (object.customMetadata?.ownerUid && identity.uid === object.customMetadata.ownerUid) return true
    return await isAdministrator(identity, env)
  } catch { return false }
}

async function serveObject(request, env, key) {
  const object = await env.MEDIA_BUCKET.get(key)
  if (!object) return errorResponse('Archivo no encontrado.', 404)
  if (key.startsWith('photos/') && !(await canReadPhoto(request, object, env))) return errorResponse('No tienes permiso para ver esta fotografía.', 403)
  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('Cache-Control', key.startsWith('setlist-covers/') ? 'public, max-age=31536000, immutable' : 'private, no-store')
  const etag = object.httpEtag || object.etag
  if (etag) headers.set('ETag', etag)
  return new Response(request.method === 'HEAD' ? null : object.body, { headers })
}

async function deleteObject(request, env, key) {
  if (!isAllowedOrigin(request, env)) return errorResponse('Origen no autorizado.', 403)
  const object = await env.MEDIA_BUCKET.get(key)
  if (!object) return new Response(null, { status: 204 })
  let allowed = false
  if (key.startsWith('photos/')) allowed = await canReadPhoto(request, object, env)
  else {
    try { allowed = await isAdministrator(await optionalIdentity(request, env), env) } catch { allowed = false }
  }
  if (!allowed) return errorResponse('No tienes permiso para eliminar este archivo.', 403)
  await env.MEDIA_BUCKET.delete(key)
  return new Response(null, { status: 204 })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let response
    if (request.method === 'OPTIONS') response = isAllowedOrigin(request, env) ? new Response(null, { status: 204 }) : errorResponse('Origen no autorizado.', 403)
    else if (request.method === 'GET' && url.pathname === '/health') response = json({ ok: true, bucket: 'private' })
    else if (request.method === 'POST' && url.pathname === '/v1/photos') response = await uploadPhoto(request, env)
    else if (request.method === 'POST' && url.pathname === '/v1/setlist-covers') response = await uploadSetlistCover(request, env)
    else if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname.startsWith('/v1/media/')) {
      const key = validObjectKey(url.pathname)
      response = key ? await serveObject(request, env, key) : errorResponse('Ruta de archivo inválida.', 400)
    } else if (request.method === 'DELETE' && url.pathname.startsWith('/v1/media/')) {
      const key = validObjectKey(url.pathname)
      response = key ? await deleteObject(request, env, key) : errorResponse('Ruta de archivo inválida.', 400)
    } else response = errorResponse('Ruta no encontrada.', 404)
    return withCors(response, request, env)
  },
}
