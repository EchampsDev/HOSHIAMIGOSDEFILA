const productionWorkerUrl = 'https://brattypolitan-r2-media.edwardocampossantana.workers.dev'
const configuredBaseUrl = (import.meta.env.VITE_R2_MEDIA_API_URL?.trim() || (import.meta.env.PROD ? productionWorkerUrl : '')).replace(/\/+$/, '')

export const isR2MediaConfigured = Boolean(configuredBaseUrl)

export function r2MediaUrl(path: string) {
  if (!configuredBaseUrl) throw new Error('Cloudflare R2 no está configurado en este entorno.')
  return `${configuredBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export async function r2Request(path: string, init: RequestInit = {}) {
  const response = await fetch(r2MediaUrl(path), init)
  if (response.ok) return response
  let message = 'No fue posible completar la operación con Cloudflare R2.'
  try { message = String((await response.json() as { error?: string }).error || message) } catch { /* respuesta no JSON */ }
  throw new Error(message)
}
